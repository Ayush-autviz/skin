# Environment Setup Guide


### 1. Install and Login to EAS
```bash
npm install -g eas-cli@latest
eas login
```

### 2. Set up your environment files
Make sure you have `.env.development` and `.env.production` files in the root directory with your Firebase configuration.

You can copy from `.env.example`:
```bash
cp .env.example .env.development
cp .env.example .env.production
```

Then edit them with your actual Firebase values from:
- Firebase Console → Project Settings → General tab → Your apps section

### 3. Run the Environment Setup Script
```bash
node scripts/setup-env.js
```

The script will automatically read your `.env` files and set up all EAS environment variables.

### 3. That's it!
The script automatically sets up all environment variables for development, preview, and production builds.

## What the Script Sets Up

- **Environment indicators** (development/preview/production)
- **Firebase configuration** (API keys, project IDs, etc.)
- **Feature flags** (debug logging, analytics)

## Manual Commands (if needed)

If you need to add individual environment variables later:

```bash
# List current variables
eas env:list

# Create a new variable
eas env:create --name VARIABLE_NAME --value "value" --environment production

# Delete a variable
eas env:delete --name VARIABLE_NAME --environment production
```

## Building the App

After environment setup:

```bash
# Development build
eas build --platform ios --profile development

# Preview build  
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

## Troubleshooting

- **"Please run eas login first"**: You need to authenticate with EAS
- **"Variable already exists"**: The script will skip existing variables automatically
- **Missing Firebase values**: Check Firebase Console → Project Settings → General tab 