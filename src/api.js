import { supabase } from './lib/supabase'

export async function createProject(userId, region = 'vlaanderen') {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ user_id: userId, region, status: 'draft' }])
    .select()
    .single()

  if (error) throw new Error('Failed to create project: ' + error.message)
  return data
}

export async function uploadFile(file, userId, projectId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${projectId}/before.${fileExt}`

  const { data, error } = await supabase.storage
    .from('user-uploads')
    .upload(fileName, file, { upsert: true })

  if (error) throw new Error('Failed to upload file: ' + error.message)

  const { data: { publicUrl } } = supabase.storage
    .from('user-uploads')
    .getPublicUrl(fileName)

  return { file_path: fileName, url: publicUrl }
}

export async function analyzeBeforeState(projectId, orientationHint, dimensionsCm, imagePath, forceMock = false) {
  if (forceMock) {
    const mockBeforeState = {
      dimensions_cm: dimensionsCm,
      fixtures: {
        toilet: { present: true, position: 'back_left', type: 'wall_mounted' },
        washbasin: { present: true, position: 'front_right', type: 'countertop' },
        shower: { present: true, position: 'back_right', type: 'walk_in' },
        bathtub: { present: false }
      },
      plumbing_estimate: {
        water_inlet_likely: 'back_wall',
        waste_outlet_likely: 'back_wall_left',
        confidence: 'medium'
      }
    }

    const mockAnchors = [
      { x: 0.2, y: 0.8, fixture: 'toilet' },
      { x: 0.8, y: 0.2, fixture: 'washbasin' },
      { x: 0.8, y: 0.8, fixture: 'shower' }
    ]

    const { error } = await supabase
      .from('before_states')
      .insert([{ project_id: projectId, data: mockBeforeState }])

    if (error) throw new Error('Failed to save before state: ' + error.message)

    return { before_state: mockBeforeState, anchors: mockAnchors }
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-before`
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      project_id: projectId,
      orientation_hint: orientationHint,
      dimensions_cm: dimensionsCm,
      image_path: imagePath
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error('Failed to analyze before state: ' + error)
  }

  return res.json()
}

export async function fetchCatalog(filters = {}) {
  let query = supabase.from('catalog_items').select('*')

  if (filters.category) {
    query = query.eq('category', filters.category)
  }
  if (filters.min_price) {
    query = query.gte('price_eur', filters.min_price)
  }
  if (filters.max_price) {
    query = query.lte('price_eur', filters.max_price)
  }

  const { data, error } = await query

  if (error) throw new Error('Failed to fetch catalog: ' + error.message)
  return data
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
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) throw new Error('Failed to fetch project: ' + error.message)
  return data
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
