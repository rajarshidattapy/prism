import os

def create_project_scaffold(base_path):
    """Creates the directories and blank files for the PRISM project."""
    
    # Dictionary mapping directory paths (relative to base_path) to a list of files
    structure = {
        "anchor/programs/prism_markets/": ["lib.rs", "Cargo.toml"],
        "anchor/tests/": ["prism_markets.ts"],
        "anchor/": ["Anchor.toml"],
        
        "agent/characters/": ["prism_orchestrator.json"],
        "agent/plugins/plugin-pmxt/": ["index.ts", "package.json"],
        "agent/plugins/plugin-prism/": ["index.ts", "package.json"],
        "agent/plugins/plugin-switchboard/": ["index.ts", "package.json"],
        "agent/src/": ["actions.ts", "evaluators.ts", "providers.ts"],
        "agent/": ["agent.ts", "package.json", "tsconfig.json"],
        
        "simulation/scripts/": ["run_matrix.py", "generate_attestation.py"],
        "simulation/models/": ["sentiment_parser.py", "agent_prompts.json"],
        "simulation/outputs/": [".keep"],
        
        "web/app/": ["page.tsx", "layout.tsx", "globals.css"],
        "web/components/": ["TerminalUI.tsx", "MarketDashboard.tsx"],
        "web/hooks/": ["useSolanaWallet.ts", "usePrismMarket.ts"],
        "web/lib/": ["pmxt-client.ts", "utils.ts"],
        "web/": ["package.json", "tsconfig.json", "next.config.js"],
        
        "nos_job_def/": ["prism_agent.json", "oasis_simulation.json"],
        
        "scripts/": ["setup_local.sh", "deploy_nosana.ts"],
        
        # Root directory files
        "": [
            ".env.example",
            ".gitignore",
            "bun.lockb",
            "docker-compose.yml",
            "Dockerfile",
            "package.json",
            "README.md"
        ]
    }

    # Create root directory
    if not os.path.exists(base_path):
        os.makedirs(base_path)
        print(f"📁 Created base directory: {base_path}/")

    for folder, files in structure.items():
        dir_path = os.path.join(base_path, folder)
        
        # Create subdirectories if they don't exist
        if folder and not os.path.exists(dir_path):
            os.makedirs(dir_path)
            print(f"  📁 Created directory: {folder}")

        # Create the blank files
        for file_name in files:
            file_path = os.path.join(dir_path, file_name)
            with open(file_path, 'w') as f:
                # Add minimal boilerplate for a few key files
                if file_name == "README.md":
                    f.write("# PRISM\n\n> The AI-native prediction market infrastructure and simulation engine built for the agentic economy.\n")
                elif file_name == ".gitignore":
                    f.write("node_modules/\n.env\ndist/\nbuild/\n.next/\ntarget/\n")
                elif file_name == ".env.example":
                    f.write('SOLANA_RPC_URL=""\nPRIVATE_KEY=""\nNOSANA_API_KEY=""\nOPENAI_API_KEY=""\n')
                elif file_name == "setup_local.sh":
                    f.write("#!/bin/bash\n\necho 'Starting PRISM local environment...'\n")
            
            print(f"    📄 Created file: {file_name}")

if __name__ == "__main__":
    project_dir = "prism"
    print(f"🚀 Initializing PRISM project scaffold in './{project_dir}'...\n")
    
    create_project_scaffold(project_dir)
    
    print("\n✅ Scaffold complete! Run the following to get started:")
    print(f"   cd {project_dir}")
    print("   bun install")