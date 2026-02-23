import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';

// Function to prompt user and save keys
function promptAndSaveKeys(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter private keys (comma-separated): ', (input: string) => {
    const privateKeys: string[] = input.split(',').map(key => key.trim());

    const filePath: string = path.resolve(__dirname, 'otherWallets.json');
    const jsonContent: string = JSON.stringify(privateKeys, null, 2);

    fs.writeFile(filePath, jsonContent, (err) => {
      if (err) {
        console.error('❌ Error saving keys:', err);
      } else {
        console.log('✅ Private keys saved to otherWallets.json');
      }
      rl.close();
    });
  });
}

promptAndSaveKeys();
