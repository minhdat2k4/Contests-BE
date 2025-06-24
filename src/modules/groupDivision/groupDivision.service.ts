import { prisma } from "@/config/database";
import { ContestantStatus, Role } from "@prisma/client";
import {
  DivideGroupsInput,
  GetAvailableContestantsInput,
  GetAvailableJudgesInput,
  ContestantInfo,
  JudgeInfo,
  GroupInfo
} from "./groupDivision.schema";

export default class GroupDivisionService {
  /**
   * Lấy danh sách thí sinh có thể tham gia trận đấu
   */
  static async getAvailableContestants(
    matchId: number,
    query: GetAvailableContestantsInput
  ) {
    const { roundId, status, schoolId, classId, search, page, limit } = query;

    // Lấy thông tin trận đấu
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { round: true } 
    });

    if (!match) {
      throw new Error("Không tìm thấy trận đấu");
    }

    // Điều kiện lọc
    const whereConditions: any = {
      contestId: match.round.contestId,
      ...(roundId ? { roundId } : { roundId: match.roundId }),
      ...(status ? { status: status as ContestantStatus } : { status: "compete" })
    };    // Điều kiện tìm kiếm theo tên hoặc mã sinh viên
    if (search) {
      whereConditions.student = {
        OR: [
          { fullName: { contains: search } },
          { studentCode: { contains: search } }
        ]
      };
    }

    // Lọc theo trường học
    if (schoolId) {
      whereConditions.student = {
        ...whereConditions.student,
        class: {
          schoolId
        }
      };
    }

    // Lọc theo lớp
    if (classId) {
      whereConditions.student = {
        ...whereConditions.student,
        classId
      };
    }

    // Đếm tổng số thí sinh
    const total = await prisma.contestant.count({
      where: whereConditions
    });

    // Lấy danh sách thí sinh với phân trang
    const contestants = await prisma.contestant.findMany({
      where: whereConditions,
      include: {
        student: {
          include: {
            class: {
              include: {
                school: true
              }
            }
          }
        }
      },      orderBy: [
        { student: { fullName: "asc" } }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      contestants: contestants as ContestantInfo[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy danh sách trọng tài có thể chấm thi
   */
  static async getAvailableJudges(query: GetAvailableJudgesInput) {
    const { search, page, limit } = query;

    const whereConditions: any = {
      role: Role.Judge,
      isActive: true
    };

    if (search) {
      whereConditions.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const total = await prisma.user.count({
      where: whereConditions
    });

    const judges = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        username: true,
        email: true
      },
      orderBy: { username: "asc" },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      judges: judges as JudgeInfo[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy danh sách nhóm hiện tại của trận đấu
   */
  static async getCurrentGroups(matchId: number): Promise<GroupInfo[]> {
    const groups = await prisma.group.findMany({
      where: { matchId },
      include: {        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },        contestantMatches: {
          include: {
            contestant: {
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    studentCode: true
                  }
                },
                round: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { registrationNumber: "asc" }
        }
      },
      orderBy: { name: "asc" }
    });    return groups.map(group => ({
      id: group.id,
      name: group.name,
      userId: group.userId,
      judge: {
        id: group.user.id,
        username: group.user.username,
        email: group.user.email
      },      contestantMatches: group.contestantMatches.map((cm: any) => ({
        contestant: {
          id: cm.contestant.id,
          student: {
            id: cm.contestant.student.id,
            fullName: cm.contestant.student.fullName,
            studentCode: cm.contestant.student.studentCode
          },
          round: {
            id: cm.contestant.round.id,
            name: cm.contestant.round.name
          }
        },
        registrationNumber: cm.registrationNumber
      }))
    }));
  }

  /**
   * Chia nhóm thí sinh cho trận đấu
   */
  static async divideGroups(matchId: number, input: DivideGroupsInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra trận đấu có tồn tại không
      const match = await tx.match.findUnique({
        where: { id: matchId }
      });

      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      // 2. Xóa dữ liệu cũ (Groups và ContestantMatches)
      await tx.contestantMatch.deleteMany({
        where: { matchId }
      });

      await tx.group.deleteMany({
        where: { matchId }
      });

      // 3. Tạo các nhóm mới
      const createdGroups = [];
      
      for (let i = 0; i < input.groups.length; i++) {
        const groupData = input.groups[i];
        
        // Kiểm tra trọng tài có tồn tại và có role Judge không
        const judge = await tx.user.findFirst({
          where: {
            id: groupData.judgeId,
            role: Role.Judge,
            isActive: true
          }
        });

        if (!judge) {
          throw new Error(`Không tìm thấy trọng tài với ID ${groupData.judgeId}`);
        }

        // Tạo nhóm
        const groupName = groupData.groupName || `Nhóm ${String.fromCharCode(65 + i)}`; // A, B, C...
        
        const createdGroup = await tx.group.create({
          data: {
            name: groupName,
            userId: groupData.judgeId,
            matchId: matchId,
            confirmCurrentQuestion: 0
          }
        });

        // Tạo ContestantMatches cho nhóm này
        for (let j = 0; j < groupData.contestantIds.length; j++) {
          const contestantId = groupData.contestantIds[j];
          
          // Kiểm tra thí sinh có tồn tại không
          const contestant = await tx.contestant.findUnique({
            where: { id: contestantId }
          });

          if (!contestant) {
            throw new Error(`Không tìm thấy thí sinh với ID ${contestantId}`);
          }

          await tx.contestantMatch.create({
            data: {
              contestantId,
              matchId,
              groupId: createdGroup.id,
              registrationNumber: j + 1, // Số thứ tự trong nhóm
              status: "not_started"
            }
          });
        }

        createdGroups.push(createdGroup);
      }

      return createdGroups;
    });
  }

  /**
   * Lấy danh sách trường học để lọc
   */
  static async getSchools() {
    return await prisma.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: "asc" }
    });
  }

  /**
   * Lấy danh sách lớp học theo trường để lọc
   */
  static async getClassesBySchool(schoolId: number) {
    return await prisma.class.findMany({
      where: { 
        schoolId,
        isActive: true 
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: "asc" }
    });
  }
}
