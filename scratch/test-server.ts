import { exec } from 'child_process'

async function main() {
  const server = exec('npm run dev')
  server.stdout?.on('data', d => console.log(d.toString()))
  server.stderr?.on('data', d => console.error(d.toString()))
  
  // wait 5 seconds for it to start
  await new Promise(r => setTimeout(r, 5000))
  
  console.log('Sending request...')
  try {
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'test',
        messages: [{ role: 'user', content: 'SYNCORA REAL AI CONNECTION WORKS' }]
      })
    })
    const text = await res.text()
    console.log('Status:', res.status)
    console.log('Response:', text.slice(0, 200))
  } catch(e) {
    console.error(e)
  }
  
  server.kill()
}
main()
