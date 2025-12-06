const API_BASE = ''

export async function createProject(userId, region = 'vlaanderen') {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, region })
  })
  if (!res.ok) throw new Error('Failed to create project')
  return res.json()
}

export async function uploadFile(file, userId, projectId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', userId)
  formData.append('project_id', projectId)

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) throw new Error('Failed to upload file')
  return res.json()
}

export async function analyzeBeforeState(projectId, orientationHint, dimensionsCm, imagePath, forceMock = false) {
  const res = await fetch(`${API_BASE}/api/before`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      orientation_hint: orientationHint,
      dimensions_cm: dimensionsCm,
      image_path: imagePath,
      force_mock: forceMock
    })
  })
  if (!res.ok) throw new Error('Failed to analyze before state')
  return res.json()
}

export async function fetchCatalog(filters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.append('category', filters.category)
  if (filters.min_price) params.append('min_price', filters.min_price)
  if (filters.max_price) params.append('max_price', filters.max_price)

  const res = await fetch(`${API_BASE}/api/catalog?${params}`)
  if (!res.ok) throw new Error('Failed to fetch catalog')
  return res.json()
}

export async function submitSelection(projectId, selectedIds, roomImagePath, anchors, style = {}, constraints = {}, renderIntent = {}) {
  const res = await fetch(`${API_BASE}/api/selection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      selected_ids: selectedIds,
      room_image_path: roomImagePath,
      anchors,
      style,
      constraints,
      render_intent: renderIntent
    })
  })
  if (!res.ok) throw new Error('Failed to submit selection')
  return res.json()
}

export async function generateAfterImage(projectId, userId, floorplan, products, style, constraints, roomImagePath, productImagePaths, seed) {
  const res = await fetch(`${API_BASE}/api/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      user_id: userId,
      floorplan,
      products,
      style,
      constraints,
      room_image_path: roomImagePath,
      product_image_paths: productImagePaths,
      seed
    })
  })
  if (!res.ok) throw new Error('Failed to generate image')
  return res.json()
}

export async function generateWorkPlan(projectId, beforeState, afterState, scenario = 'mid') {
  const res = await fetch(`${API_BASE}/api/workplan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      before_state: beforeState,
      after_state: afterState,
      scenario
    })
  })
  if (!res.ok) throw new Error('Failed to generate work plan')
  return res.json()
}

export async function calculatePricing(projectId, workPlan, region = 'vlaanderen', customMultiplier = 1.0, pricingTable = null) {
  const res = await fetch(`${API_BASE}/api/pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      work_plan: workPlan,
      region,
      custom_multiplier: customMultiplier,
      pricing_table: pricingTable
    })
  })
  if (!res.ok) throw new Error('Failed to calculate pricing')
  return res.json()
}

export async function getProject(projectId) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`)
  if (!res.ok) throw new Error('Failed to fetch project')
  return res.json()
}

export async function getPendingProjects() {
  const res = await fetch(`${API_BASE}/api/admin/projects`)
  if (!res.ok) throw new Error('Failed to fetch pending projects')
  return res.json()
}

export async function approveProject(projectId, userId, status, notes = null) {
  const res = await fetch(`${API_BASE}/api/admin/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      user_id: userId,
      status,
      notes
    })
  })
  if (!res.ok) throw new Error('Failed to approve/reject project')
  return res.json()
}
