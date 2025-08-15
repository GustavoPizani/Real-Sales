import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get total clients
    const clientsResult = await query("SELECT COUNT(*) as count FROM clients")
    const totalClients = clientsResult[0]?.count || 0

    // Get total properties
    const propertiesResult = await query("SELECT COUNT(*) as count FROM properties")
    const totalProperties = propertiesResult[0]?.count || 0

    // Get total tasks
    const tasksResult = await query("SELECT COUNT(*) as count FROM tasks WHERE status != ?", ["completed"])
    const totalTasks = tasksResult[0]?.count || 0

    // Get completed tasks
    const completedTasksResult = await query("SELECT COUNT(*) as count FROM tasks WHERE status = ?", ["completed"])
    const completedTasks = completedTasksResult[0]?.count || 0

    // Get active clients (not in final status)
    const activeClientsResult = await query("SELECT COUNT(*) as count FROM clients WHERE funnel_status NOT IN (?, ?)", [
      "Contrato",
      "Cancelado",
    ])
    const activeClients = activeClientsResult[0]?.count || 0

    // Calculate conversion rate
    const conversionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0

    return NextResponse.json({
      totalClients,
      totalProperties,
      totalTasks,
      completedTasks,
      activeClients,
      conversionRate,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
