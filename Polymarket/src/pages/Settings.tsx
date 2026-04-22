import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  Key, 
  Wallet,
  Globe,
  Moon,
  Sun,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Navbar } from '@/components/ui/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Settings = () => {
  const { toast } = useToast();

  const [notifications, setNotifications] = useState({
    tradeExecuted: true,
    tradesFailed: true,
    stopLossHit: true,
    weeklyReport: true,
    telegram: false,
  });

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="glass w-full justify-start">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold mb-6">Profile</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">0x1a2b...3c4d</p>
                      <p className="text-sm text-muted-foreground">Connected via MetaMask</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input placeholder="Enter display name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (Optional)</Label>
                      <Input type="email" placeholder="Enter email" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold mb-6">Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Currency</p>
                        <p className="text-sm text-muted-foreground">Display currency for values</p>
                      </div>
                    </div>
                    <Select defaultValue="usd">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD</SelectItem>
                        <SelectItem value="eur">EUR</SelectItem>
                        <SelectItem value="gbp">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Theme</p>
                        <p className="text-sm text-muted-foreground">Interface color scheme</p>
                      </div>
                    </div>
                    <Select defaultValue="dark">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="glow">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold mb-6">Trade Alerts</h2>
                <div className="space-y-4">
                  {[
                    { key: 'tradeExecuted', label: 'Trade Executed', desc: 'When a copy trade is successfully executed' },
                    { key: 'tradesFailed', label: 'Trade Failed', desc: 'When a trade fails to execute' },
                    { key: 'stopLossHit', label: 'Stop Loss Hit', desc: 'When a stop loss is triggered' },
                    { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly performance summary' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications]}
                        onCheckedChange={(v) => setNotifications(n => ({ ...n, [item.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold mb-6">Telegram Integration</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Telegram Bot</p>
                      <p className="text-sm text-muted-foreground">Receive alerts via Telegram</p>
                    </div>
                    <Switch
                      checked={notifications.telegram}
                      onCheckedChange={(v) => setNotifications(n => ({ ...n, telegram: v }))}
                    />
                  </div>
                  {notifications.telegram && (
                    <div className="space-y-2 pt-2">
                      <Label>Telegram Chat ID</Label>
                      <Input placeholder="Enter your Telegram chat ID" />
                      <p className="text-xs text-muted-foreground">
                        Message @PolyCopyBot to get your chat ID
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleSave} className="glow">
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api" className="space-y-6">
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold mb-2">Polymarket API Keys</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Connect your Polymarket account for automated trading
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Secret</Label>
                    <Input
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Enter your API secret"
                    />
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-sm text-warning">
                      <strong>Security Note:</strong> Your API keys are encrypted at rest and never stored in plain text.
                      Only use keys with trade-only permissions.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="glow">
                <Key className="w-4 h-4 mr-2" />
                Save API Keys
              </Button>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold mb-6">Connected Wallets</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">0x1a2b...3c4d</p>
                        <p className="text-xs text-muted-foreground">MetaMask • Primary</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Disconnect</Button>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold mb-6">Security Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Session Timeout</p>
                      <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-6 border-destructive/20">
                <h2 className="text-lg font-heading font-semibold mb-2 text-destructive">Danger Zone</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Irreversible actions for your account
                </p>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                  Delete Account
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default Settings;
