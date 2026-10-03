import { streamText } from 'ai'

async function main() {
  const ai = require('ai')
  console.log('Keys of ai:', Object.keys(ai).filter(k => k.toLowerCase().includes('data')))
}

main()
