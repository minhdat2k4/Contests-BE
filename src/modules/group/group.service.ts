import { prisma } from "@/config/database";
import {
  CreateGroupInput,
  UpdateGroupInput,
  GroupQueryInput,
  GrouType,
  GroupByIdType,
} from "./group.schema";
import { Group } from "@prisma/client";

export default class GroupService {
  static async getAll(
    query: GroupQueryInput,
    contestId: number | null
  ): Promise<{
    groups: GrouType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, matchId, userId } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Lọc theo matchId (trận đấu)
    if (matchId !== undefined) {
      whereClause.matchId = matchId;
    }

    // Lọc theo userId (trọng tài)
    if (userId !== undefined) {
      whereClause.userId = userId;
    }
    console.log(query, contestId);

    // Lọc theo contestId (cuộc thi)
    if (contestId !== null) {
      whereClause.match = {
        ...(whereClause.match || {}),
        contestId,
      };
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        {
          user: {
            is: { username: { contains: keyword } },
          },
        },
        { match: { is: { name: { contains: keyword } } } },
      ]);
    }

    // Truy vấn dữ liệu
    const groupRaw = await prisma.group.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        confirmCurrentQuestion: true,
        user: { select: { username: true } },
        match: { select: { name: true } },
      },
    });

    // Biến đổi kết quả trả về
    const group = groupRaw.map(key => ({
      id: key.id,
      name: key.name,
      confirmCurrentQuestion: key.confirmCurrentQuestion,
      userName: key.user?.username ?? "",
      matchName: key.match?.name ?? "",
    }));

    // Tính tổng số dòng phù hợp
    const total = await prisma.group.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);

    return {
      groups: group,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getBy(data: Partial<Group>): Promise<GroupByIdType | null> {
    return prisma.group.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        name: true,
        matchId: true,
        userId: true,
        confirmCurrentQuestion: true,
        user: {
          select: { username: true },
        },
        match: { select: { name: true } },
      },
    });
  }

  static async create(data: CreateGroupInput): Promise<Group | null> {
    return prisma.group.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateGroupInput
  ): Promise<Group | null> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.confirmCurrentQuestion !== undefined) {
      updateData.confirmCurrentQuestion = data.confirmCurrentQuestion;
    }

    if (data.matchId !== undefined) {
      updateData.matchId = data.matchId;
    }

    if (data.userId !== undefined) {
      updateData.userId = data.userId;
    }
    return prisma.group.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }

  static async updateName(id: number, name: string): Promise<Group | null> {
    return prisma.group.update({
      where: { id: id },
      data: { name: name },
    });
  }

  static async delete(id: number): Promise<Group> {
    return prisma.group.delete({
      where: {
        id: id,
      },
    });
  }

  static async deleteWithContestants(id: number): Promise<Group> {
    return await prisma.$transaction(async (tx) => {
      // Xóa tất cả thí sinh trong nhóm trước
      await tx.contestantMatch.deleteMany({
        where: { groupId: id },
      });

      // Xóa nhóm
      return await tx.group.delete({
        where: { id: id },
      });
    });
  }
}
