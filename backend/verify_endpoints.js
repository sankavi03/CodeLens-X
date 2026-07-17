const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080';
let token = null;
let workspaceId = null;
let testUsername = `verifier_${Math.random().toString(36).substring(2, 7)}`;
let testPassword = 'Password123!';
let selectedFilePath = '';

async function runTests() {
  console.log('=== STARTING CODELENS-X REST API VERIFICATION ===\n');
  const results = [];

  const runTest = async (name, fn) => {
    console.log(`[TEST] Running: ${name}...`);
    try {
      await fn();
      console.log(`[PASS] ${name}\n`);
      results.push({ name, status: 'PASS' });
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      console.log();
      results.push({ name, status: 'FAIL', error: err.message });
    }
  };

  // 1. Authentication Endpoints
  await runTest('Register New User', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, email: `${testUsername}@example.com`, password: testPassword })
    });
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`Unexpected status code: ${res.status}`);
    }
    const data = await res.json();
    if (!data.message || !data.message.includes('successfully')) {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  });

  await runTest('Duplicate Registration Error Handling', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, email: `${testUsername}@example.com`, password: testPassword })
    });
    if (res.status !== 409) {
      throw new Error(`Expected status 409, got ${res.status}`);
    }
    const data = await res.json();
    if (!data.message) {
      throw new Error(`Expected error message, got: ${JSON.stringify(data)}`);
    }
  });

  await runTest('Invalid Login Credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: testUsername, password: 'WrongPassword!' })
    });
    if (res.status !== 401) {
      throw new Error(`Expected status 401, got ${res.status}`);
    }
  });

  await runTest('Valid Login & JWT Access Token Generation', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: testUsername, password: testPassword })
    });
    if (res.status !== 200) {
      throw new Error(`Login failed with status: ${res.status}`);
    }
    const data = await res.json();
    if (!data.accessToken) {
      throw new Error('Access token not found in login response');
    }
    token = data.accessToken;
    console.log(`  -> JWT Generated: Bearer ${token.substring(0, 15)}...`);
  });

  await runTest('Silent JWT Refresh Token mechanics', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Token refresh failed with status: ${res.status}`);
    }
    const data = await res.json();
    if (!data.accessToken) {
      throw new Error('Refreshed access token not found in response');
    }
    token = data.accessToken;
    console.log(`  -> Refreshed JWT: Bearer ${token.substring(0, 15)}...`);
  });

  await runTest('Get User Profile (/users/me)', async () => {
    const res = await fetch(`${BASE_URL}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`User profile fetch failed: ${res.status}`);
    }
    const data = await res.json();
    if (data.username !== testUsername) {
      throw new Error(`Username mismatch: expected ${testUsername}, got ${data.username}`);
    }
  });

  // 2. Workspace Endpoints
  await runTest('Workspace ZIP File Upload', async () => {
    const zipPath = path.resolve(__dirname, '..', 'sample.zip');
    if (!fs.existsSync(zipPath)) {
      throw new Error(`ZIP file not found at path: ${zipPath}`);
    }
    const fileBuffer = fs.readFileSync(zipPath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });

    const formData = new FormData();
    formData.append('file', fileBlob, 'sample.zip');

    const res = await fetch(`${BASE_URL}/api/workspaces/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (res.status !== 201) {
      const text = await res.text();
      throw new Error(`Upload failed with status: ${res.status}. Error: ${text}`);
    }
    const data = await res.json();
    if (!data.workspaceId) {
      throw new Error('Workspace ID missing from upload response');
    }
    workspaceId = data.workspaceId;
    console.log(`  -> Workspace Uploaded & Processed: ID ${workspaceId}`);
  });

  await runTest('Get Workspace List', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Workspace list failed: ${res.status}`);
    }
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('Expected workspace list array to be non-empty');
    }
    const workspace = list.find(w => w.workspaceId === workspaceId);
    if (!workspace) {
      throw new Error(`Uploaded workspace ${workspaceId} not found in user list`);
    }
  });

  await runTest('Retrieve Workspace Metadata Tree', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/tree`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Explorer tree fetch failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.root || !data.root.name) {
      throw new Error('Invalid Explorer Tree structure returned');
    }

    // Helper to find a file path to inspect
    const findFile = (node) => {
      if (node.type && node.type.toUpperCase() === 'FILE') {
        return node.relativePath;
      }
      if (node.children) {
        for (const child of node.children) {
          const res = findFile(child);
          if (res) return res;
        }
      }
      return null;
    };
    selectedFilePath = findFile(data.root);
    if (!selectedFilePath) {
      throw new Error('No files found in workspace tree');
    }
    console.log(`  -> Selected file path for next tests: ${selectedFilePath}`);
  });

  await runTest('Retrieve File Content', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/file?path=${encodeURIComponent(selectedFilePath)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`File content retrieval failed: ${res.status}`);
    }
    const data = await res.json();
    if (data.content === undefined) {
      throw new Error('File content field missing from response');
    }
    console.log(`  -> File size retrieved: ${data.content.length} chars`);
  });

  // 3. AI Endpoints
  await runTest('Explain File via Gemini AI API', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/ai/explain-file?path=${encodeURIComponent(selectedFilePath)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      const text = await res.text();
      throw new Error(`Explain file API error (status ${res.status}): ${text}`);
    }
    const data = await res.json();
    if (!data.explanation || data.explanation.trim() === '') {
      throw new Error('Explanation content empty or missing');
    }
    console.log(`  -> Explanation snippet: ${data.explanation.substring(0, 100).replace(/\n/g, ' ')}...`);
  });

  await runTest('Workspace AI Chat Response Generation', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/ai/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Explain what patterns exist in this codebase' })
    });
    if (res.status !== 200) {
      const text = await res.text();
      throw new Error(`Chat API error (status ${res.status}): ${text}`);
    }
    const data = await res.json();
    if (!data.content || data.content.trim() === '') {
      throw new Error('Chat response content empty or missing');
    }
    console.log(`  -> Chat response snippet: ${data.content.substring(0, 100).replace(/\n/g, ' ')}...`);
  });

  await runTest('Workspace AI Project Summary Generation', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/ai/project-summary`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      const text = await res.text();
      throw new Error(`Project summary API error (status ${res.status}): ${text}`);
    }
    const data = await res.json();
    if (!data.summary || data.summary.trim() === '') {
      throw new Error('Project summary empty or missing');
    }
    console.log(`  -> Summary snippet: ${data.summary.substring(0, 100).replace(/\n/g, ' ')}...`);
  });

  // 4. Generators
  await runTest('README.md Generation & Markdown format', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/generator/readme`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`README generation failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.readme || data.readme.trim() === '') {
      throw new Error('Generated README content empty or missing');
    }
    // Simple markdown structure verification
    if (!data.readme.startsWith('#') && !data.readme.includes('\n#')) {
      throw new Error('Generated README is not valid Markdown (missing headers)');
    }
    console.log(`  -> README length generated: ${data.readme.length} chars`);
  });

  await runTest('Class Documentation Generation & Markdown format', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/generator/docs?path=${encodeURIComponent(selectedFilePath)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Docs generation failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.documentation || data.documentation.trim() === '') {
      throw new Error('Generated documentation empty or missing');
    }
    if (!data.documentation.includes('#') && !data.documentation.includes('*')) {
      throw new Error('Generated documentation is not valid Markdown');
    }
    console.log(`  -> Documentation length generated: ${data.documentation.length} chars`);
  });

  const diagramTypes = [
    'flowchart', 'class_diagram', 'sequence_diagram',
    'dependency_graph', 'package_diagram', 'component_diagram',
    'deployment_diagram'
  ];

  for (const type of diagramTypes) {
    await runTest(`Architecture Diagram Generator: ${type}`, async () => {
      const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/generator/architecture?type=${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status !== 200) {
        throw new Error(`Architecture generation for ${type} failed: ${res.status}`);
      }
      const data = await res.json();
      if (!data.architecture || data.architecture.trim() === '') {
        throw new Error(`Architecture diagram output for ${type} is empty or missing`);
      }
      // Verify Mermaid Syntax contains correct keywords depending on type
      const diagram = data.architecture.trim();
      if (diagram.includes('```mermaid') || diagram.includes('```')) {
        throw new Error('Mermaid response contains markdown blocks wrap error');
      }
      
      const lower = diagram.toLowerCase();
      if (type === 'class_diagram' && !lower.includes('classdiagram')) {
        throw new Error('Class diagram output lacks classDiagram keyword');
      }
      if (type === 'sequence_diagram' && !lower.includes('sequencediagram')) {
        throw new Error('Sequence diagram output lacks sequenceDiagram keyword');
      }
      
      console.log(`  -> Type: ${type} (Output starting with: "${diagram.substring(0, 30).replace(/\n/g, ' ')}...")`);
    });
  }

  // 5. Analysis
  await runTest('Workspace Metrics & Statistics Calculation', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/analysis/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Stats fetch failed: ${res.status}`);
    }
    const stats = await res.json();
    if (stats.totalFiles === undefined || stats.codeLines === undefined) {
      throw new Error('Stats fields missing from response');
    }
    console.log(`  -> Files found: ${stats.totalFiles}, Code Lines: ${stats.codeLines}`);
  });

  await runTest('Retrieve Coupling Dependency Graph Data', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/analysis/dependencies`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Dependencies fetch failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.internalDependencyGraph) {
      throw new Error('Dependency mapping missing from dependencies response');
    }
  });

  await runTest('Design Pattern Detector Service', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/analysis/design-patterns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Design patterns fetch failed: ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data.detectedPatterns)) {
      throw new Error('detectedPatterns array missing from pattern response');
    }
    console.log(`  -> Patterns detected: ${data.detectedPatterns.length}`);
  });

  await runTest('Insights & Code Smells Collector', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/analysis/insights`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Insights fetch failed: ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data.codeSmells)) {
      throw new Error('codeSmells array missing from insights response');
    }
    console.log(`  -> Code smells found: ${data.codeSmells.length}`);
  });

  // 6. Delete & Session Cleanup
  await runTest('Delete Workspace', async () => {
    const res = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Workspace deletion failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error('Workspace deletion response indicated failure');
    }
  });

  await runTest('Session Logout Endpoint Verification', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) {
      throw new Error(`Logout failed with status: ${res.status}`);
    }
    console.log('  -> Logout endpoint responded successfully');
  });

  console.log('\n=== VERIFICATION RESULTS SUMMARY ===');
  let failures = 0;
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    console.log(`${icon} ${r.status.padEnd(4)}: ${r.name}`);
    if (r.status === 'FAIL') {
      failures++;
      console.log(`      Error: ${r.error}`);
    }
  });

  if (failures > 0) {
    console.log(`\nVerification FAILED with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('\nAll verification tests PASSED successfully!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});
