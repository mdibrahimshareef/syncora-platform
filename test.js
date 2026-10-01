(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', id: '123', parts: [{ type: 'text', text: 'Hi' }] }],
        workspaceId: 'test_workspace',
        contextUrl: '/'
      })
    });
    
    console.log('STATUS:', res.status);
    console.log('HEADERS:', Object.fromEntries(res.headers));
    
    const text = await res.text();
    console.log('BODY:', text);
  } catch (err) {
    console.error('ERROR:', err);
  }
})();
