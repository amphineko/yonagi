import { generateDefaultSite } from "./default"
import { generateDynamicClientSite } from "./dynamicClients"
import { generateInnerTunnelSite } from "./innerTunnel"
import { RaddbGenParams } from "../.."

export async function generateSites(params: RaddbGenParams): Promise<void> {
    await Promise.all([generateDefaultSite(params), generateDynamicClientSite(params), generateInnerTunnelSite(params)])
}
