import type { Response, NextFunction } from "express"
import type { AuthRequest } from "../middleware/auth.middleware"
import { AppError } from "../utils/appError"
import { User } from "../models/user.model"
import { Farm } from "../models/farm.model"
import { Investment } from "../models/investment.model"
import { Harvest } from "../models/harvest.model"


export class AdminController {
  /**
   * GET /admin/farms
   * Get all farms with pagination and filters
   */
  static async getFarms(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, status, verified } = req.query
      const skip = (Number(page) - 1) * Number(limit)

      const filter: any = {}
      if (status) filter.status = status
      if (verified !== undefined) filter.verified = verified === "true"

      const [farms, total] = await Promise.all([
        Farm.find(filter)
          .populate("farmerId", "name email location")
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
        Farm.countDocuments(filter),
      ])

      res.status(200).json({
        success: true,
        message: "Farms retrieved successfully",
        data: {
          farms,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /admin/users
   * Get all users with pagination and role filters
   */
  static async getUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, role, verified, kycStatus } = req.query
      const skip = (Number(page) - 1) * Number(limit)

      const filter: any = {}
      if (role) filter.role = role
      if (verified !== undefined) filter.verified = verified === "true"
      if (kycStatus) filter.kycStatus = kycStatus

      const [users, total] = await Promise.all([
        User.find(filter).select("-password -magicToken").skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
        User.countDocuments(filter),
      ])

      res.status(200).json({
        success: true,
        message: "Users retrieved successfully",
        data: {
          users,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /admin/investments
   * Get all investments with pagination and status filters
   */
  static async getInvestments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, status } = req.query
      const skip = (Number(page) - 1) * Number(limit)

      const filter: any = {}
      if (status) filter.status = status

      const [investments, total] = await Promise.all([
        Investment.find(filter)
          .populate("farmId", "farmName location")
          .populate("investorId", "name email")
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
        Investment.countDocuments(filter),
      ])

      res.status(200).json({
        success: true,
        message: "Investments retrieved successfully",
        data: {
          investments,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /admin/verify-farm/:farmId
   * Verify a farm and update its status
   */
  static async verifyFarm(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { farmId } = req.params
      const { verified, notes } = req.body

      if (typeof verified !== "boolean") {
        throw new AppError("Verified status must be a boolean", 400)
      }

      const farm = await Farm.findByIdAndUpdate(
        farmId,
        {
          verified,
          verificationNotes: notes,
          verifiedAt: verified ? new Date() : null,
          verifiedBy: verified ? req.user?.userId : null,
        },
        { new: true },
      )

      if (!farm) {
        throw new AppError("Farm not found", 404)
      }

      res.status(200).json({
        success: true,
        message: `Farm ${verified ? "verified" : "unverified"} successfully`,
        data: { farm },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /admin/approve-harvest/:harvestId
   * Approve or reject a harvest submission
   */
  static async approveHarvest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { harvestId } = req.params
      const { approved, notes } = req.body

      if (typeof approved !== "boolean") {
        throw new AppError("Approved status must be a boolean", 400)
      }

      const harvest = await Harvest.findByIdAndUpdate(
        harvestId,
        {
          status: approved ? "approved" : "rejected",
          approvalNotes: notes,
          approvedAt: new Date(),
          approvedBy: req.user?.userId,
        },
        { new: true },
      ).populate("farmId investmentId")

      if (!harvest) {
        throw new AppError("Harvest not found", 404)
      }

      res.status(200).json({
        success: true,
        message: `Harvest ${approved ? "approved" : "rejected"} successfully`,
        data: { harvest },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /admin/analytics
   * Get platform analytics and statistics
   */
  static async getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalUsers,
        totalFarmers,
        totalInvestors,
        totalFarms,
        verifiedFarms,
        totalInvestments,
        totalHarvests,
        approvedHarvests,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "farmer" }),
        User.countDocuments({ role: "investor" }),
        Farm.countDocuments(),
        Farm.countDocuments({ verified: true }),
        Investment.countDocuments(),
        Harvest.countDocuments(),
        Harvest.countDocuments({ status: "approved" }),
      ])

      // Calculate investment metrics
      const investmentStats = await Investment.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            averageAmount: { $avg: "$amount" },
            count: { $sum: 1 },
          },
        },
      ])

      const totalInvestmentAmount = investmentStats[0]?.totalAmount || 0
      const averageInvestmentAmount = investmentStats[0]?.averageAmount || 0

      // Calculate harvest metrics
      const harvestStats = await Harvest.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalYield: { $sum: "$yield" },
          },
        },
      ])

      const harvestByStatus = harvestStats.reduce(
        (acc, stat) => {
          acc[stat._id] = { count: stat.count, totalYield: stat.totalYield }
          return acc
        },
        {} as Record<string, { count: number; totalYield: number }>,
      )

      // Get recent activity
      const recentFarms = await Farm.find().sort({ createdAt: -1 }).limit(5).select("farmName location createdAt")

      const recentInvestments = await Investment.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("farmId", "farmName")
        .populate("investorId", "name")
        .select("amount status createdAt")

      res.status(200).json({
        success: true,
        message: "Analytics retrieved successfully",
        data: {
          overview: {
            totalUsers,
            totalFarmers,
            totalInvestors,
            totalFarms,
            verifiedFarms,
            verificationRate: totalFarms > 0 ? ((verifiedFarms / totalFarms) * 100).toFixed(2) : 0,
          },
          investments: {
            totalInvestments,
            totalAmount: totalInvestmentAmount,
            averageAmount: averageInvestmentAmount.toFixed(2),
          },
          harvests: {
            totalHarvests,
            approvedHarvests,
            approvalRate: totalHarvests > 0 ? ((approvedHarvests / totalHarvests) * 100).toFixed(2) : 0,
            byStatus: harvestByStatus,
          },
          recentActivity: {
            farms: recentFarms,
            investments: recentInvestments,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
