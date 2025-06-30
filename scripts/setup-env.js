#!/usr/bin/env node

/**
 * Environment Setup Script for Magic Mirror App
 * 
 * This script sets up all required environment variables for EAS builds.
 * Run this after cloning the project and setting up EAS.
 * 
 * Usage: node scripts/setup-env.js
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Environment variables configuration
const ENV_VARS = {
  // Basic environment indicators
  basic: [
    {
      name: 'EXPO_PUBLIC_ENVIRONMENT',
      description: 'Environment identifier',
      values: {
        development: 'development',
        preview: 'preview', 
        production: 'production'
      },
      visibility: 'plain'
    }
  ],
  
  // Firebase configuration (sensitive)
  firebase: [
    {
      name: 'EXPO_PUBLIC_FIREBASE_API_KEY',
      description: 'Firebase API Key',
      visibility: 'secret'
    },
    {
      name: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      description: 'Firebase Auth Domain (e.g., your-project.firebaseapp.com)',
      visibility: 'secret'
    },
    {
      name: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      description: 'Firebase Project ID',
      visibility: 'sensitive'
    },
    {
      name: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      description: 'Firebase Storage Bucket (e.g., your-project.appspot.com)',
      visibility: 'secret'
    },
    {
      name: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      description: 'Firebase Messaging Sender ID',
      visibility: 'secret'
    },
    {
      name: 'EXPO_PUBLIC_FIREBASE_APP_ID',
      description: 'Firebase App ID',
      visibility: 'secret'
    },
    {
      name: 'EXPO_PUBLIC_FIREBASE_DATABASE_URL',
      description: 'Firebase Realtime Database URL',
      visibility: 'secret'
    }
  ],
  
  // Feature flags and other config
  features: [
    {
      name: 'EXPO_PUBLIC_ENABLE_DEBUG_LOGS',
      description: 'Enable debug logging',
      values: {
        development: 'true',
        preview: 'false',
        production: 'false'
      },
      visibility: 'plain'
    },
    {
      name: 'EXPO_PUBLIC_ENABLE_ANALYTICS',
      description: 'Enable analytics tracking',
      values: {
        development: 'false',
        preview: 'true', 
        production: 'true'
      },
      visibility: 'plain'
    }
  ]
};

const ENVIRONMENTS = ['development', 'preview', 'production'];

// Function to read and parse .env files
function readEnvFile(envFile) {
  const envPath = path.join(process.cwd(), envFile);
  
  if (!fs.existsSync(envPath)) {
    console.log(`⚠️  ${envFile} not found, skipping...`);
    return {};
  }
  
  console.log(`📖 Reading ${envFile}...`);
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}

async function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function setEnvironmentVariable(varName, value, environment, visibility = 'plain') {
  const visibilityFlag = visibility === 'secret' ? '--visibility secret' : 
                        visibility === 'sensitive' ? '--visibility sensitive' : 
                        '--visibility plain';
  
  const command = `eas env:create --name "${varName}" --value "${value}" --environment ${environment} ${visibilityFlag} --non-interactive`;
  
  try {
    await runCommand(command, `Setting ${varName} for ${environment}`);
  } catch (error) {
    console.log(`⚠️  ${varName} might already exist for ${environment}, skipping...`);
  }
}

async function main() {
  console.log('🚀 Magic Mirror Environment Setup Script');
  console.log('==========================================\n');
  
  console.log('This script will set up all environment variables for EAS builds.');
  console.log('You will need your Firebase configuration values.\n');
  
  const proceed = await question('Do you want to continue? (y/n): ');
  if (proceed.toLowerCase() !== 'y') {
    console.log('Setup cancelled.');
    rl.close();
    return;
  }
  
  // Check if EAS is authenticated
  try {
    await runCommand('eas whoami', 'Checking EAS authentication');
  } catch (error) {
    console.log('\n❌ Please run "eas login" first to authenticate with EAS.');
    rl.close();
    return;
  }
  
  console.log('\n📖 Reading environment files...\n');
  
  // Read environment files
  const devEnv = readEnvFile('.env.development');
  const prodEnv = readEnvFile('.env.production');
  
  // Check if we have the required Firebase variables
  const requiredVars = ENV_VARS.firebase.map(v => v.name);
  const missingVars = requiredVars.filter(varName => !devEnv[varName] && !prodEnv[varName]);
  
  if (missingVars.length > 0) {
    console.log('\n⚠️  Missing some Firebase configuration variables:');
    console.log(missingVars.map(v => `  - ${v}`).join('\n'));
    console.log('\nPlease add these to your .env.development and .env.production files');
    console.log('You can find these values in Firebase Console > Project Settings > General tab\n');
    rl.close();
    return;
  }
  
  console.log('✅ All required environment variables found in .env files');
  console.log('\n🔧 Setting up environment variables for all environments...\n');
  
  // Set up variables for each environment
  for (const env of ENVIRONMENTS) {
    console.log(`\n--- Setting up ${env.toUpperCase()} environment ---`);
    
    // Set basic environment variables
    for (const varConfig of ENV_VARS.basic) {
      const value = varConfig.values[env];
      await setEnvironmentVariable(varConfig.name, value, env, varConfig.visibility);
    }
    
    // Set Firebase variables (read from appropriate .env file)
    for (const varConfig of ENV_VARS.firebase) {
      let value;
      if (env === 'development') {
        value = devEnv[varConfig.name];
      } else if (env === 'production') {
        value = prodEnv[varConfig.name];
      } else {
        // For preview, use production values as fallback
        value = prodEnv[varConfig.name] || devEnv[varConfig.name];
      }
      
      if (value) {
        await setEnvironmentVariable(varConfig.name, value, env, varConfig.visibility);
      } else {
        console.log(`⚠️  ${varConfig.name} not found for ${env}, skipping...`);
      }
    }
    
    // Set feature flags
    for (const varConfig of ENV_VARS.features) {
      const value = varConfig.values[env];
      await setEnvironmentVariable(varConfig.name, value, env, varConfig.visibility);
    }
  }
  
  console.log('\n✅ Environment setup complete!');
  console.log('\nYou can now run:');
  console.log('- eas build --platform ios --profile development');
  console.log('- eas build --platform ios --profile preview'); 
  console.log('- eas build --platform ios --profile production');
  console.log('\nTo view your environment variables: eas env:list');
  
  rl.close();
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\nSetup interrupted.');
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
}); 