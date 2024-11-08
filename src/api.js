export async function submitProject(data) {
    const response = await fetch(import.meta.env.VITE_API_URL+'/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit project');
    }
  
    return response.json();
  }
  