const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function callOpenAI(systemPrompt, userPrompt) {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API 키 없음')
    return null
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    console.error('OpenAI API 오류:', response.status)
    return null
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || null
}
