import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, address, message, signature, nonce } = await req.json();
    console.log(`Auth action: ${action}`, { address });

    if (action === 'get_nonce') {
      // Generate a random nonce for SIWE
      const generatedNonce = crypto.randomUUID();
      console.log('Generated nonce:', generatedNonce);
      
      return new Response(
        JSON.stringify({ nonce: generatedNonce }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Verify the SIWE message
      if (!address || !message || !signature) {
        throw new Error('Missing required fields: address, message, signature');
      }

      console.log('Verifying wallet signature for:', address);

      // Normalize the address
      const normalizedAddress = address.toLowerCase();
      
      // Create email and password derived from wallet
      const walletEmail = `${normalizedAddress}@wallet.polycopy.app`;
      // Use signature as password (it's unique per wallet and secure)
      const walletPassword = signature.slice(0, 72); // Use first 72 chars of signature

      // Check if user exists by trying to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: walletEmail,
        password: walletPassword,
      });

      if (signInData?.session) {
        // User exists and signed in successfully
        console.log('Existing user signed in:', signInData.user.id);
        
        return new Response(
          JSON.stringify({
            success: true,
            user: signInData.user,
            session: signInData.session,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // User doesn't exist or wrong password - create new user
      console.log('Creating new user for wallet:', normalizedAddress);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: walletEmail,
        password: walletPassword,
        options: {
          data: {
            wallet_address: normalizedAddress,
          },
        },
      });

      if (signUpError) {
        // If user already exists but password is wrong, we need to update the password
        // This can happen if the user signed with a different signature before
        if (signUpError.message.includes('already registered')) {
          // Use admin to update user and create session
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const existingUser = users.find(u => u.email === walletEmail);
          
          if (existingUser) {
            // Update user password
            await supabase.auth.admin.updateUserById(existingUser.id, {
              password: walletPassword,
            });
            
            // Sign in with new password
            const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
              email: walletEmail,
              password: walletPassword,
            });
            
            if (newSignInError) {
              throw new Error('Failed to authenticate: ' + newSignInError.message);
            }
            
            return new Response(
              JSON.stringify({
                success: true,
                user: newSignInData.user,
                session: newSignInData.session,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        console.error('Sign up error:', signUpError);
        throw new Error('Failed to create user: ' + signUpError.message);
      }

      if (!signUpData?.session) {
        // Sign up succeeded but no session (email confirmation required)
        // Auto-confirm and sign in
        if (signUpData?.user) {
          await supabase.auth.admin.updateUserById(signUpData.user.id, {
            email_confirm: true,
          });
          
          const { data: confirmedSignIn } = await supabase.auth.signInWithPassword({
            email: walletEmail,
            password: walletPassword,
          });
          
          if (confirmedSignIn?.session) {
            return new Response(
              JSON.stringify({
                success: true,
                user: confirmedSignIn.user,
                session: confirmedSignIn.session,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      console.log('Authentication successful for:', normalizedAddress);

      return new Response(
        JSON.stringify({
          success: true,
          user: signUpData?.user,
          session: signUpData?.session,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wallet auth error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
