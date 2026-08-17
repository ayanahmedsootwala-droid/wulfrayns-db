// RPM Public API — full CRUD integration endpoint for external AI assistants
// Auth: Bearer API key stored in rpm_api_keys table
//
// READ endpoints (require "read" permission):
//   GET  /rpm-public-api/vehicles                list vehicles
//   GET  /rpm-public-api/vehicles/:id            single vehicle
//   GET  /rpm-public-api/inventory/summary       counts by status/make
//   GET  /rpm-public-api/makes                   distinct makes
//   GET  /rpm-public-api/inquiries               list inquiries
//   GET  /rpm-public-api/inquiries/:id           single inquiry
//
// WRITE endpoints (require "write" permission):
//   POST   /rpm-public-api/vehicles              create vehicle
//   PUT    /rpm-public-api/vehicles/:id          update vehicle
//   DELETE /rpm-public-api/vehicles/:id          delete vehicle
//   POST   /rpm-public-api/inquiries             create inquiry
//   PUT    /rpm-public-api/inquiries/:id         update inquiry status/notes
//
// OpenAPI schema for ChatGPT Custom GPT Actions:
//   GET  /rpm-public-api/openapi.json            returns OpenAPI 3.1 spec
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

// ── OpenAPI 3.1 spec for ChatGPT Custom GPT ──────────────────────────────────
function openApiSpec(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Wulfrayn's DB API",
      description: "External API for managing vehicle inventory and customer inquiries in Wulfrayn's DB dealership management system. Use this to list, search, create, update, and delete vehicles and inquiries.",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "Your Wulfrayn's DB API key" },
      },
    },
    paths: {
      "/vehicles": {
        get: {
          operationId: "listVehicles",
          summary: "List available vehicles",
          description: "Returns a paginated list of vehicles from the inventory. Filter by make, price range, status, etc.",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 50 } },
            { name: "make", in: "query", schema: { type: "string" }, description: "Filter by make (e.g. Toyota, Honda)" },
            { name: "model", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" }, description: "available, sold, reserved, in_transit" },
            { name: "min_price", in: "query", schema: { type: "integer" }, description: "Min selling price in PKR" },
            { name: "max_price", in: "query", schema: { type: "integer" }, description: "Max selling price in PKR" },
          ],
          responses: { "200": { description: "List of vehicles" } },
        },
        post: {
          operationId: "createVehicle",
          summary: "Create a new vehicle listing",
          description: "Add a new vehicle to the inventory.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["make", "model"],
                  properties: {
                    make: { type: "string" }, model: { type: "string" }, variant: { type: "string" },
                    model_year: { type: "integer" }, color: { type: "string" }, mileage: { type: "integer" },
                    expected_selling_price: { type: "integer" }, purchase_price: { type: "integer" },
                    engine_capacity: { type: "string" }, fuel_type: { type: "string" },
                    transmission: { type: "string" }, registration_number: { type: "string" },
                    origin: { type: "string", enum: ["local", "imported"] },
                    status: { type: "string", default: "available" },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Vehicle created" } },
        },
      },
      "/vehicles/{id}": {
        get: {
          operationId: "getVehicle",
          summary: "Get a single vehicle by ID",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Vehicle details" } },
        },
        put: {
          operationId: "updateVehicle",
          summary: "Update a vehicle listing",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object", description: "Any vehicle fields to update" },
              },
            },
          },
          responses: { "200": { description: "Vehicle updated" } },
        },
        delete: {
          operationId: "deleteVehicle",
          summary: "Delete a vehicle listing",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Vehicle deleted" } },
        },
      },
      "/inquiries": {
        get: {
          operationId: "listInquiries",
          summary: "List customer inquiries",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "status", in: "query", schema: { type: "string" }, description: "new, in_progress, resolved, closed" },
          ],
          responses: { "200": { description: "List of inquiries" } },
        },
        post: {
          operationId: "createInquiry",
          summary: "Submit a customer inquiry",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["customer_name", "customer_phone"],
                  properties: {
                    customer_name: { type: "string" }, customer_phone: { type: "string" },
                    customer_email: { type: "string" }, description: { type: "string" },
                    vehicle_id: { type: "string" }, budget: { type: "integer" },
                    preferred_make: { type: "string" }, preferred_model: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Inquiry created" } },
        },
      },
      "/inquiries/{id}": {
        get: {
          operationId: "getInquiry",
          summary: "Get a single inquiry by ID",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Inquiry details" } },
        },
        put: {
          operationId: "updateInquiry",
          summary: "Update inquiry status or notes",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["new", "in_progress", "resolved", "closed"] },
                    notes: { type: "string" },
                    assigned_to: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Inquiry updated" } },
        },
      },
      "/inventory/summary": {
        get: {
          operationId: "getInventorySummary",
          summary: "Get inventory summary counts by status and make",
          responses: { "200": { description: "Inventory summary" } },
        },
      },
      "/makes": {
        get: {
          operationId: "listMakes",
          summary: "List all distinct vehicle makes in inventory",
          responses: { "200": { description: "List of makes" } },
        },
      },
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/rpm-public-api\/?/, "").split("/").filter(Boolean);
  const resource = pathParts[0];
  const resourceId = pathParts[1];

  // ── OpenAPI spec — no auth required ──────────────────────────────────────
  if (req.method === "GET" && resource === "openapi.json") {
    const baseUrl = `${url.protocol}//${url.host}/rpm-public-api`;
    return json(openApiSpec(baseUrl));
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!apiKey) return err("Missing API key. Pass Authorization: Bearer <key> header.", 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: keyRow } = await supabase
    .from("rpm_api_keys")
    .select("id, name, permissions, is_active")
    .eq("key_hash", apiKey)
    .maybeSingle();

  if (!keyRow || !keyRow.is_active) return err("Invalid or inactive API key.", 401);

  const perms: string[] = keyRow.permissions ?? ["read"];
  const canRead  = perms.includes("read")  || perms.includes("write");
  const canWrite = perms.includes("write");

  // ── GET /vehicles ─────────────────────────────────────────────────────────
  if (req.method === "GET" && resource === "vehicles" && !resourceId) {
    if (!canRead) return err("Permission denied.", 403);
    const page    = parseInt(url.searchParams.get("page") ?? "1");
    const limit   = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
    const make    = url.searchParams.get("make");
    const model   = url.searchParams.get("model");
    const status  = url.searchParams.get("status");
    const minP    = url.searchParams.get("min_price");
    const maxP    = url.searchParams.get("max_price");

    let q = supabase
      .from("rpm_vehicles")
      .select("id,make,model,variant,model_year,engine_capacity,fuel_type,transmission,mileage,color,origin,status,expected_selling_price,is_negotiable,is_hot_deal,stock_number,notes,created_at", { count: "exact" })
      .range((page - 1) * limit, page * limit - 1)
      .order("created_at", { ascending: false });

    if (make)   q = q.ilike("make",   `%${make}%`);
    if (model)  q = q.ilike("model",  `%${model}%`);
    if (status) q = q.eq("status", status); else q = q.eq("status", "available");
    if (minP)   q = q.gte("expected_selling_price", parseInt(minP));
    if (maxP)   q = q.lte("expected_selling_price", parseInt(maxP));

    const { data, count, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data, total: count, page, limit });
  }

  // ── GET /vehicles/:id ─────────────────────────────────────────────────────
  if (req.method === "GET" && resource === "vehicles" && resourceId) {
    if (!canRead) return err("Permission denied.", 403);
    const { data, error } = await supabase
      .from("rpm_vehicles")
      .select("id,make,model,variant,model_year,engine_capacity,fuel_type,transmission,mileage,color,origin,status,expected_selling_price,purchase_price,is_negotiable,is_hot_deal,stock_number,registration_number,notes,description,created_at")
      .eq("id", resourceId)
      .maybeSingle();
    if (error || !data) return err("Vehicle not found.", 404);
    return json({ data });
  }

  // ── POST /vehicles ────────────────────────────────────────────────────────
  if (req.method === "POST" && resource === "vehicles") {
    if (!canWrite) return err("Permission denied. Need 'write' permission.", 403);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return err("Invalid JSON body."); }
    if (!body.make || !body.model) return err("make and model are required.");

    const allowedFields = ["make","model","variant","model_year","color","mileage","expected_selling_price",
      "purchase_price","engine_capacity","fuel_type","transmission","registration_number","origin","status","notes","description"];
    const payload: Record<string, unknown> = { status: "available" };
    for (const f of allowedFields) { if (body[f] !== undefined) payload[f] = body[f]; }

    const { data, error } = await supabase.from("rpm_vehicles").insert(payload).select().single();
    if (error) return err(error.message, 500);
    return json({ data, message: "Vehicle created." }, 201);
  }

  // ── PUT /vehicles/:id ─────────────────────────────────────────────────────
  if (req.method === "PUT" && resource === "vehicles" && resourceId) {
    if (!canWrite) return err("Permission denied. Need 'write' permission.", 403);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return err("Invalid JSON body."); }

    const allowedFields = ["make","model","variant","model_year","color","mileage","expected_selling_price",
      "purchase_price","engine_capacity","fuel_type","transmission","registration_number","origin","status","notes","description","is_negotiable","is_hot_deal"];
    const payload: Record<string, unknown> = {};
    for (const f of allowedFields) { if (body[f] !== undefined) payload[f] = body[f]; }
    if (Object.keys(payload).length === 0) return err("No valid fields to update.");

    const { data, error } = await supabase.from("rpm_vehicles").update(payload).eq("id", resourceId).select().single();
    if (error) return err(error.message, 500);
    return json({ data, message: "Vehicle updated." });
  }

  // ── DELETE /vehicles/:id ──────────────────────────────────────────────────
  if (req.method === "DELETE" && resource === "vehicles" && resourceId) {
    if (!canWrite) return err("Permission denied. Need 'write' permission.", 403);
    const { error } = await supabase.from("rpm_vehicles").delete().eq("id", resourceId);
    if (error) return err(error.message, 500);
    return json({ message: "Vehicle deleted." });
  }

  // ── GET /inventory/summary ────────────────────────────────────────────────
  if (req.method === "GET" && resource === "inventory" && resourceId === "summary") {
    if (!canRead) return err("Permission denied.", 403);
    const { data: statusData } = await supabase.from("rpm_vehicles").select("status");
    const { data: makeData }   = await supabase.from("rpm_vehicles").select("make").eq("status", "available");

    const byStatus: Record<string, number> = {};
    for (const v of statusData ?? []) byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
    const byMake: Record<string, number> = {};
    for (const v of makeData ?? []) byMake[v.make] = (byMake[v.make] ?? 0) + 1;

    return json({ by_status: byStatus, by_make: byMake, total: statusData?.length ?? 0 });
  }

  // ── GET /makes ────────────────────────────────────────────────────────────
  if (req.method === "GET" && resource === "makes") {
    if (!canRead) return err("Permission denied.", 403);
    const { data } = await supabase.from("rpm_vehicles").select("make").eq("status", "available");
    const makes = [...new Set((data ?? []).map((v: { make: string }) => v.make))].sort();
    return json({ makes });
  }

  // ── GET /inquiries ────────────────────────────────────────────────────────
  if (req.method === "GET" && resource === "inquiries" && !resourceId) {
    if (!canRead) return err("Permission denied.", 403);
    const page   = parseInt(url.searchParams.get("page") ?? "1");
    const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
    const status = url.searchParams.get("status");

    let q = supabase
      .from("inquiries")
      .select("id,customer_name,customer_phone,customer_email,status,priority,description,inquiry_date,req_make,req_model,budget,assigned_to", { count: "exact" })
      .range((page - 1) * limit, page * limit - 1)
      .order("inquiry_date", { ascending: false });

    if (status) q = q.eq("status", status);
    const { data, count, error } = await q;
    if (error) return err(error.message, 500);
    return json({ data, total: count, page, limit });
  }

  // ── GET /inquiries/:id ────────────────────────────────────────────────────
  if (req.method === "GET" && resource === "inquiries" && resourceId) {
    if (!canRead) return err("Permission denied.", 403);
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .eq("id", resourceId)
      .maybeSingle();
    if (error || !data) return err("Inquiry not found.", 404);
    return json({ data });
  }

  // ── POST /inquiries ───────────────────────────────────────────────────────
  if (req.method === "POST" && resource === "inquiries") {
    if (!canRead) return err("Permission denied.", 403); // read permission allows creating inquiries
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return err("Invalid JSON body."); }
    if (!body.customer_name || !body.customer_phone) return err("customer_name and customer_phone are required.");

    const allowedFields = ["customer_name","customer_phone","customer_email","description",
      "vehicle_id","budget","req_make","req_model","priority","assigned_to","status"];
    const payload: Record<string, unknown> = { source: "api", status: "new", inquiry_date: new Date().toISOString() };
    for (const f of allowedFields) { if (body[f] !== undefined) payload[f] = body[f]; }

    const { data, error } = await supabase.from("inquiries").insert(payload).select().single();
    if (error) return err(error.message, 500);
    return json({ data, message: "Inquiry created." }, 201);
  }

  // ── PUT /inquiries/:id ────────────────────────────────────────────────────
  if (req.method === "PUT" && resource === "inquiries" && resourceId) {
    if (!canWrite) return err("Permission denied. Need 'write' permission.", 403);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return err("Invalid JSON body."); }

    const allowedFields = ["status","priority","notes","assigned_to","description",
      "customer_name","customer_phone","customer_email","budget","req_make","req_model"];
    const payload: Record<string, unknown> = {};
    for (const f of allowedFields) { if (body[f] !== undefined) payload[f] = body[f]; }
    if (Object.keys(payload).length === 0) return err("No valid fields to update.");

    const { data, error } = await supabase.from("inquiries").update(payload).eq("id", resourceId).select().single();
    if (error) return err(error.message, 500);
    return json({ data, message: "Inquiry updated." });
  }

  return err("Endpoint not found.", 404);
});
