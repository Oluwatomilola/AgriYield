import { Farm, type IFarm } from "../models/farm.model"
import mongoose from "mongoose"
import { Investment } from "../models/investment.model"

export interface CreateFarmMetadataInput {
  farmer: string
  name: string
  description: string
  location: {
    address: string
    coordinates?: { latitude: number; longitude: number }
    state: string
    country: string
  }
  farmType: string
  totalArea: number
  cultivatedArea: number
  irrigationType: string
  crops: string[]
  images: string[]
  documents: string[]
  expectedYield: number
  plantingDate?: Date
  harvestDate?: Date
}

export class FarmService {
  /** Store off-chain farm metadata (Step 1) */
  static async createFarmMetadata(data: CreateFarmMetadataInput): Promise<IFarm> {
    const farm = await Farm.create({
      ...data,
      farmer: data.farmer.toLowerCase(),
      status: "pending",
      blockchainFarmId: null,
      syncedFromChain: false,
    })
    return farm
  }

  /**
   * Recalculate and persist investment-related aggregates for a farm
   */
  static async updateInvestmentStats(farmId: string): Promise<IFarm | null> {
    if (!mongoose.Types.ObjectId.isValid(farmId)) return null

    const objectId = new mongoose.Types.ObjectId(farmId)

    const stats = await Investment.aggregate([
      { $match: { farmId: objectId } },
      {
        $group: {
          _id: "$farmId",
          totalInvestment: { $sum: "$amount" },
          totalActiveInvestment: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, "$amount", 0] }
          },
          totalCompletedInvestment: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] }
          },
          totalROI: { $sum: "$roiEarned" },
          totalPayouts: { $sum: "$totalPayouts" },
          investorSet: { $addToSet: "$investorId" }
        }
      }
    ])

    const s = stats[0]

    const updates: Partial<IFarm> = {}
    if (s) {
      updates.amountRaised = s.totalInvestment || 0
      updates.investorCount = Array.isArray(s.investorSet) ? s.investorSet.length : 0
      // store numeric totalProceeds and string-totalInvested for backward compatibility
      updates.totalProceeds = s.totalROI || 0
      updates.totalInvested = (s.totalInvestment || 0).toString()
    } else {
      updates.amountRaised = 0
      updates.investorCount = 0
      updates.totalProceeds = 0
      updates.totalInvested = "0"
    }

    updates.lastSyncedAt = new Date()

    return await Farm.findByIdAndUpdate(farmId, updates, { new: true })
  }

  /** Link farm metadata with blockchain farmId (called after FarmCreated event) */
  static async linkFarmWithBlockchain(
    farmer: string,
    blockchainFarmId: number,
    onChainData: {
      fundingGoal: string
      sharePrice: string
      deadline: number
      minROI: number
      maxROI: number
      metaCID: string
    },
  ): Promise<IFarm | null> {
    const farm = await Farm.findOneAndUpdate(
      { farmer: farmer.toLowerCase(), status: "pending", blockchainFarmId: null },
      { blockchainFarmId, ...onChainData, status: "active", syncedFromChain: true },
      { new: true, sort: { createdAt: -1 } },
    )
    return farm
  }

  /** Update farm with on-chain data */
  static async updateFromBlockchain(blockchainFarmId: number, updates: Partial<IFarm>): Promise<IFarm | null> {
    return await Farm.findOneAndUpdate({ blockchainFarmId }, { ...updates, syncedFromChain: true }, { new: true })
  }

  /** Get farm by blockchain ID */
  static async getFarmByBlockchainId(blockchainFarmId: number): Promise<IFarm | null> {
    return await Farm.findOne({ blockchainFarmId })
  }

  /** Get farm by MongoDB ID */
  static async getFarmById(id: string): Promise<IFarm | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null
    return await Farm.findById(id)
  }

  /** Get all farms with optional filters */
  static async getFarms(
    filters: { status?: string; farmType?: string; state?: string; verified?: boolean; farmer?: string },
    page = 1,
    limit = 10,
  ): Promise<{ farms: IFarm[]; total: number }> {
    const query: any = {}
    if (filters.status) query.status = filters.status
    if (filters.farmType) query.farmType = filters.farmType
    if (filters.state) query["location.state"] = filters.state
    if (filters.verified !== undefined) query.verified = filters.verified
    if (filters.farmer) query.farmer = filters.farmer.toLowerCase()

    const [farms, total] = await Promise.all([
      Farm.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Farm.countDocuments(query),
    ])
    return { farms, total }
  }

  /** Update off-chain farm metadata */
  static async updateFarmMetadata(id: string, farmer: string, updates: Partial<CreateFarmMetadataInput>): Promise<IFarm | null> {
    const farm = await Farm.findOne({ _id: id, farmer: farmer.toLowerCase() })
    if (!farm) return null

    const allowedUpdates = {
      description: updates.description,
      location: updates.location,
      images: updates.images,
      documents: updates.documents,
      plantingDate: updates.plantingDate,
      harvestDate: updates.harvestDate,
    }
    Object.assign(farm, allowedUpdates)
    await farm.save()
    return farm
  }

  /** Get farms by farmer */
  static async getFarmsByFarmer(farmer: string): Promise<IFarm[]> {
    return await Farm.find({ farmer: farmer.toLowerCase() }).sort({ createdAt: -1 })
  }

  /** Search farms by keyword and optional filters */
  static async searchFarms(
    query: string,
    filters?: { farmType?: string; state?: string; minArea?: number; maxArea?: number },
  ): Promise<IFarm[]> {
    const searchQuery: any = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { crops: { $in: [new RegExp(query, "i")] } },
      ],
    }
    if (filters?.farmType) searchQuery.farmType = filters.farmType
    if (filters?.state) searchQuery["location.state"] = filters.state
    if (filters?.minArea) searchQuery.totalArea = { $gte: filters.minArea }
    if (filters?.maxArea) searchQuery.totalArea = { ...searchQuery.totalArea, $lte: filters.maxArea }

    return await Farm.find(searchQuery).sort({ createdAt: -1 }).limit(20)
  }
}
