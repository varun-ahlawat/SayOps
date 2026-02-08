require("dotenv").config({ path: ".env.local" })

async function main() {
  const { GoogleAuth } = require("google-auth-library")
  const { BigQuery } = require("@google-cloud/bigquery")

  const projectId = process.env.GCP_PROJECT_ID || "evently-486001"
  const dataset = process.env.BQ_DATASET || "sayops"
  const bq = new BigQuery({ projectId })

  console.log("1. Testing embedding generation...")
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] })
  const client = await auth.getClient()

  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-005:predict`

  const res = await client.request({
    url,
    method: "POST",
    data: { instances: [{ content: "What is your return policy?" }] },
  })

  const embedding = res.data.predictions[0].embeddings.values
  console.log("   Embedding generated! Dimension:", embedding.length)
  console.log("   First 5 values:", embedding.slice(0, 5))

  console.log("\n2. Checking user_documents table...")
  const [rows] = await bq.query({
    query: `SELECT id, agent_id, file_name, ocr_status, ARRAY_LENGTH(embedding) as emb_len FROM \`${projectId}.${dataset}.user_documents\` LIMIT 10`,
    location: "US",
  })
  console.log("   Documents found:", rows.length)
  rows.forEach((r) =>
    console.log("   -", r.file_name, "| ocr:", r.ocr_status, "| embedding dims:", r.emb_len || "null")
  )

  const docsWithEmbeddings = rows.filter((r) => r.emb_len > 0)
  if (docsWithEmbeddings.length > 0) {
    console.log("\n3. Running VECTOR_SEARCH with topK=3...")
    const agentId = docsWithEmbeddings[0].agent_id
    const [searchResults] = await bq.query({
      query: `
        SELECT base.id, base.file_name, base.raw_text, distance
        FROM VECTOR_SEARCH(
          TABLE \`${projectId}.${dataset}.user_documents\`,
          'embedding',
          (SELECT @queryEmbedding AS embedding),
          top_k => 3,
          distance_type => 'COSINE'
        )
        WHERE base.agent_id = @agentId
        ORDER BY distance ASC
      `,
      params: { queryEmbedding: embedding, agentId },
      location: "US",
    })
    console.log("   Results:", searchResults.length)
    searchResults.forEach((r) =>
      console.log("   -", r.file_name, "| distance:", r.distance, "| text:", (r.raw_text || "").substring(0, 80))
    )
  } else {
    console.log("\n3. No documents with embeddings — skipping VECTOR_SEARCH.")
    console.log("   Upload a .txt file via the app first.")
  }

  console.log("\nDone!")
}

main().catch((err) => {
  console.error("ERROR:", err.message)
  if (err.response) console.error("Response:", JSON.stringify(err.response.data).substring(0, 500))
})
