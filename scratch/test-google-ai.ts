import { generateText } from 'ai';
import { getLanguageModel } from '../src/lib/ai/provider';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const model = getLanguageModel();
    if (!model) {
      console.log('Model is mock');
      return;
    }
    console.log('Testing model with Google Provider...');
    
    const { text } = await generateText({
      model: model,
      prompt: 'Hello, world!',
    });
    
    console.log('Success! Response:', text);
  } catch (err) {
    console.error('Error during generation:', err);
  }
}

main();
