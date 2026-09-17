const API_BASE = 'http://localhost:3000';
const REDIRECT_BASE = 'http://localhost:4000';

async function testAll() {
  console.log('Testing APIs...');
  
  // 1. Register / Sign Up
  console.log('1. Signing up...');
  const email = `test_${Date.now()}@example.com`;
  const password = 'Password123!';
  
  const signUpRes = await fetch(`${API_BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8080' },
    body: JSON.stringify({ email, password, name: 'Test User' })
  });
  
  if (!signUpRes.ok) {
    console.error('Sign up failed', await signUpRes.text());
    return;
  }
  
  // Try login
  console.log('2. Signing in...');
  const signInRes = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8080' },
    body: JSON.stringify({ email, password })
  });
  
  if (!signInRes.ok) {
    console.error('Sign in failed', await signInRes.text());
    return;
  }
  
  const cookie = signInRes.headers.get('set-cookie');
  console.log('Obtained cookie', cookie);
  
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookie
  };

  // 3. Create URL
  console.log('3. Creating a short URL...');
  const createRes = await fetch(`${API_BASE}/api/v1/urls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ destination: 'https://example.com/test' })
  });
  
  if (!createRes.ok) {
    console.error('Create URL failed', await createRes.text());
    return;
  }
  const urlData = await createRes.json();
  console.log('Created URL:', urlData);
  const shortCode = urlData.shortCode;
  
  // 4. List URLs
  console.log('4. Listing URLs...');
  const listRes = await fetch(`${API_BASE}/api/v1/urls`, { headers });
  console.log('List URLs response:', await listRes.json());
  
  // 5. Get specific URL
  console.log('5. Getting specific URL...');
  const getRes = await fetch(`${API_BASE}/api/v1/urls/${shortCode}`, { headers });
  console.log('Get URL response:', await getRes.json());
  
  // 6. Update URL
  console.log('6. Updating URL...');
  const updateRes = await fetch(`${API_BASE}/api/v1/urls/${shortCode}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ destination: 'https://example.com/updated' })
  });
  console.log('Update URL response:', await updateRes.json());
  
  // 7. Test Redirect
  console.log('7. Testing Redirect Service...');
  const redirectRes = await fetch(`${REDIRECT_BASE}/${shortCode}`, {
    redirect: 'manual'
  });
  console.log('Redirect status:', redirectRes.status);
  console.log('Redirect location:', redirectRes.headers.get('location'));
  
  // wait for analytics to process
  console.log('Waiting 2 seconds for analytics worker to process the click...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 8. Analytics
  console.log('8. Fetching Analytics...');
  const analyticsSummary = await fetch(`${API_BASE}/api/v1/urls/${shortCode}/analytics/summary`, { headers });
  console.log('Analytics summary:', await analyticsSummary.json());
  
  const analyticsTimeseries = await fetch(`${API_BASE}/api/v1/urls/${shortCode}/analytics/timeseries`, { headers });
  console.log('Analytics timeseries:', await analyticsTimeseries.json());
  
  // 9. Delete URL
  console.log('9. Deleting URL...');
  const deleteRes = await fetch(`${API_BASE}/api/v1/urls/${shortCode}`, {
    method: 'DELETE',
    headers: { 'Cookie': cookie }
  });
  console.log('Delete status:', deleteRes.status);
  console.log('Delete body:', await deleteRes.text());
  
  console.log('All tests finished successfully.');
}

testAll().catch(console.error);
