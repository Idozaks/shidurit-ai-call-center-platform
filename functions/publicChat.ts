import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // All operations use service role since this is for unauthenticated public users
    const sr = base44.asServiceRole;

    if (action === 'getTenant') {
      const { slug } = body;
      const tenants = await sr.entities.Tenant.filter({ slug, is_active: true });
      return Response.json({ tenant: tenants[0] || null });
    }

    if (action === 'createSession') {
      const { tenant_id, customer_name, mode } = body;
      const session = await sr.entities.ChatSession.create({
        tenant_id,
        customer_name,
        status: 'active',
        mode: mode || 'text'
      });
      return Response.json({ session });
    }

    if (action === 'sendMessage') {
      const { session_id, role, content } = body;
      const msg = await sr.entities.ChatMessage.create({ session_id, role, content });
      return Response.json({ message: msg });
    }

    if (action === 'getMessages') {
      const { session_id } = body;
      const messages = await sr.entities.ChatMessage.filter({ session_id }, 'created_date');
      return Response.json({ messages });
    }

    if (action === 'getSession') {
      const { session_id } = body;
      const sessions = await sr.entities.ChatSession.filter({ id: session_id });
      return Response.json({ session: sessions[0] || null });
    }

    if (action === 'updateSession') {
      const { session_id, data } = body;
      await sr.entities.ChatSession.update(session_id, data);
      return Response.json({ success: true });
    }

    if (action === 'updateTenantUsage') {
      const { tenant_id, usage_count } = body;
      await sr.entities.Tenant.update(tenant_id, { usage_count });
      return Response.json({ success: true });
    }

    if (action === 'createLead') {
      const { leadData } = body;
      const lead = await sr.entities.Lead.create(leadData);
      return Response.json({ lead });
    }

    if (action === 'updateLead') {
      const { lead_id, data } = body;
      await sr.entities.Lead.update(lead_id, data);
      return Response.json({ success: true });
    }

    if (action === 'getKnowledge') {
      const { tenant_id } = body;
      const entries = await sr.entities.KnowledgeEntry.filter({ tenant_id, is_active: true });
      return Response.json({ entries });
    }

    if (action === 'getDoctor') {
      const { doctor_id } = body;
      const doctors = await sr.entities.Doctor.filter({ id: doctor_id });
      return Response.json({ doctor: doctors[0] || null });
    }

    if (action === 'getDoctors') {
      const { tenant_id } = body;
      const doctors = await sr.entities.Doctor.filter({ tenant_id });
      return Response.json({ doctors: doctors.filter(d => d.is_available !== false) });
    }

    if (action === 'getTenantById') {
      const { tenant_id } = body;
      const tenants = await sr.entities.Tenant.filter({ id: tenant_id });
      return Response.json({ tenant: tenants[0] || null });
    }

    if (action === 'invokeLLM') {
      const { prompt, response_json_schema } = body;
      const result = await sr.integrations.Core.InvokeLLM({ prompt, response_json_schema });
      return Response.json({ result });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});