async function main() {
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
  console.log('Response:', text)
}
main()
