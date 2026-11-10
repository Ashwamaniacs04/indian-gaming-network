import { getViewer } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { ConnectionPerson, ProfileConnection } from "@/lib/types"

const EMPTY_CONNECTION: ProfileConnection = { status: "none", id: null, mutuals: [] }

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

type ConnectionEdge = { requester_id: string; addressee_id: string }
type ConnectionRow = { id: string; status: string }

async function acceptedNeighborIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profile_connections")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .limit(200)
  if (error) return [] as string[]
  return ((data ?? []) as ConnectionEdge[]).map((edge) =>
    edge.requester_id === userId ? edge.addressee_id : edge.requester_id,
  )
}

export async function getProfileConnection(profileId: string): Promise<ProfileConnection> {
  if (!isSupabaseConfigured() || !isUuid(profileId)) return EMPTY_CONNECTION
  const viewer = await getViewer()
  if (!viewer || !isUuid(viewer.id) || viewer.id === profileId) return EMPTY_CONNECTION

  const supabase = await createClient()
  const [outgoing, incoming, mine, theirs] = await Promise.all([
    supabase
      .from("profile_connections")
      .select("id, status")
      .eq("requester_id", viewer.id)
      .eq("addressee_id", profileId)
      .maybeSingle(),
    supabase
      .from("profile_connections")
      .select("id, status")
      .eq("requester_id", profileId)
      .eq("addressee_id", viewer.id)
      .maybeSingle(),
    acceptedNeighborIds(supabase, viewer.id),
    acceptedNeighborIds(supabase, profileId),
  ])

  const outgoingRow = outgoing.data as ConnectionRow | null
  const incomingRow = incoming.data as ConnectionRow | null
  const row = outgoingRow ?? incomingRow
  let status: ProfileConnection["status"] = "none"
  if (row?.status === "accepted") status = "connected"
  else if (outgoingRow) status = "requested"
  else if (incomingRow) status = "incoming"

  const shared = new Set(mine)
  const mutualIds = [...new Set(theirs.filter((id) => shared.has(id) && id !== viewer.id && id !== profileId))]
  if (mutualIds.length === 0) return { status, id: row?.id ?? null, mutuals: [] }

  const { data: people } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_path, headline")
    .in("id", mutualIds)
    .eq("onboarding_complete", true)

  const mutuals = ((people ?? []) as ConnectionPerson[])
    .slice()
    .sort((a, b) => a.display_name.localeCompare(b.display_name))

  return { status, id: row?.id ?? null, mutuals }
}
