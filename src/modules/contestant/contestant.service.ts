import { prisma } from "@/config/database";
import {
  CreateContestantInput,
  UpdateContestantInput,
  ContestantQueryInput,
  ContestantType,
  ContestantById,
} from "@/modules/contestant";
import { Contestant } from "@prisma/client";
import { group } from "console";

export default class ContestantService {
  static async getAll(
    query: ContestantQueryInput,
    contestId: number
  ): Promise<{
    contestantes: ContestantType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, roundId, status, schoolId, classId, groupId, matchId, schoolIds, classIds } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }

    if (typeof roundId === "number" && !isNaN(roundId) && roundId > 0) {
      whereClause.roundId = roundId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }

    // Filter by school ID
    if (schoolId !== undefined) {
      whereClause.student = {
        ...whereClause.student,
        class: {
          ...whereClause.student?.class,
          schoolId: schoolId
        }
      };
    }

    // Filter by class ID
    if (classId !== undefined) {
      whereClause.student = {
        ...whereClause.student,
        classId: classId
      };
    }

    // Filter by group ID
    if (groupId !== undefined && matchId) {
      if (groupId === -1) {
        // Filter for contestants not assigned to any group in this specific match
        whereClause.contestantMatches = {
          none: {
            matchId: matchId
          }
        };
      } else if (groupId > 0) {
        // Filter for contestants in specific group within this specific match
        whereClause.contestantMatches = {
          some: {
            matchId: matchId,
            groupId: groupId
          }
        };
      }
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { contest: { is: { name: { contains: keyword } } } },
        { student: { is: { fullName: { contains: keyword } } } },
        { round: { is: { name: { contains: keyword } } } },
        { student: { is: { class: { is: { school: { is: { name: { contains: keyword } } } } } } } },
        { student: { is: { class: { is: { name: { contains: keyword } } } } } },
      ]);
    }

    if (schoolIds && schoolIds.length > 0 && classIds && classIds.length > 0) {
      // Lọc theo cả trường và lớp
      whereClause.student = {
        class: {
          schoolId: { in: schoolIds },
          id: { in: classIds }
        }
      };
    } else if (schoolIds && schoolIds.length > 0) {
      // Chỉ lọc theo trường
      whereClause.student = {
        class: {
          schoolId: { in: schoolIds }
        }
      };
    } else if (classIds && classIds.length > 0) {
      // Chỉ lọc theo lớp
      whereClause.student = {
        class: {
          id: { in: classIds }
        }
      };
    }

    const ContestantRaw = await prisma.contestant.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          select: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          },
          where: matchId ? {
            matchId: matchId
          } : undefined
        },
      },
    });
    const Contestantes = ContestantRaw.map(key => ({
      id: key.id,
      fullName: key.student.fullName,
      studentCode: key.student.studentCode,
      roundName: key.round.name,
      status: key.status,
      schoolId: key.student.class.school.id,
      schoolName: key.student.class.school.name,
      classId: key.student.class.id,
      className: key.student.class.name,
      groupId: key.contestantMatches[0]?.group?.id || null,
      groupName: key.contestantMatches[0]?.group?.name || null,
    }));

    const total = await prisma.contestant.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      contestantes: Contestantes,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getContestantBy(data: any): Promise<ContestantById | null> {
    return prisma.contestant.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        roundId: true,
        studentId: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async create(data: CreateContestantInput): Promise<Contestant | null> {
    return prisma.contestant.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateContestantInput
  ): Promise<Contestant | null> {
    const updateData: any = {};

    if (data.roundId !== undefined) {
      updateData.roundId = data.roundId;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    return prisma.contestant.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }

  static async deleteContestant(id: number): Promise<Contestant> {
    return prisma.contestant.delete({
      where: {
        id: id,
      },
    });
  }

  static async getAllNotConstest(
    query: ContestantQueryInput,
    idContest: number
  ): Promise<{
    contestantes: ContestantType[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 10, search, roundId, status, contestId } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (roundId) whereClause.roundId = roundId;
    if (status) whereClause.status = status;

    // Tìm kiếm theo tên cuộc thi, thí sinh, vòng thi
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        {
          contest: {
            name: {
              contains: keyword,
            },
          },
        },
        {
          student: {
            fullName: {
              contains: keyword,
            },
          },
        },
        {
          round: {
            name: {
              contains: keyword,
            },
          },
        },
      ]);
    }

    const students = await prisma.contestant.findMany({
      where: { contestId: idContest },
      select: { studentId: true },
    });

    const arrIds = students.map(item => item.studentId);

    const contestantsRaw = await prisma.contestant.findMany({
      where: {
        ...whereClause,
        contestId: { not: idContest },
        studentId: {
          notIn: arrIds,
        },
      },
      skip,
      distinct: ["studentId"],
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
        },
        round: {
          select: {
            name: true,
          },
        },
        contest: {
          select: {
            name: true,
          },
        },
      },
    });

    const contestants = contestantsRaw.map(item => ({
      id: item.id,
      fullName: item.student.fullName,
      studentCode: item.student.studentCode,
      roundName: item.round.name,
      status: item.status,
      studentId: item.student.id,
      schoolId: item.student.class.school.id,
      schoolName: item.student.class.school.name,
      classId: item.student.class.id,
      className: item.student.class.name,
    }));

    // Đếm tổng số bản ghi
    const uniqueStudents = await prisma.contestant.groupBy({
      by: ["studentId"],
      where: {
        ...whereClause,
        contestId: { not: idContest },
        studentId: {
          notIn: arrIds,
        },
      },
    });

    const total = uniqueStudents.length;
    const totalPages = Math.ceil(total / limit);

    return {
      contestantes: contestants,
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

  static async getContestantByIdAndMatch(
    contestantId: number,
    matchId: number
  ): Promise<any> {
    return prisma.contestant.findFirst({
      where: {
        id: contestantId,
        contestantMatches: {
          some: {
            matchId: matchId
          }
        }
      },
      select: {
        id: true,
        roundId: true,
        studentId: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          select: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          },
          where: {
            matchId: matchId
          }
        },
      },
    });
  }

  static async getAllWithMatchGroups(
    query: ContestantQueryInput,
    contestId: number,
    matchId?: number
  ): Promise<{
    contestantes: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, roundId, status, schoolId, classId } = query;
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (contestId !== undefined) {
      whereClause.contestId = contestId;
    }

    if (roundId !== undefined) {
      whereClause.roundId = roundId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }

    // Filter by school ID
    if (schoolId !== undefined) {
      whereClause.student = {
        ...whereClause.student,
        class: {
          ...whereClause.student?.class,
          schoolId: schoolId
        }
      };
    }

    // Filter by class ID
    if (classId !== undefined) {
      whereClause.student = {
        ...whereClause.student,
        classId: classId
      };
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { contest: { is: { name: { contains: keyword } } } },
        { student: { is: { fullName: { contains: keyword } } } },
        { round: { is: { name: { contains: keyword } } } },
        { student: { is: { class: { is: { school: { is: { name: { contains: keyword } } } } } } } },
        { student: { is: { class: { is: { name: { contains: keyword } } } } } },
      ]);
    }

    const ContestantRaw = await prisma.contestant.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          select: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          },
          where: matchId ? {
            matchId: matchId
          } : undefined
        },
      },
    });

    const Contestantes = ContestantRaw.map(key => ({
      id: key.id,
      fullName: key.student.fullName,
      studentCode: key.student.studentCode,
      roundName: key.round.name,
      status: key.status,
      schoolId: key.student.class.school.id,
      schoolName: key.student.class.school.name,
      classId: key.student.class.id,
      className: key.student.class.name,
      group: key.contestantMatches[0]?.group || null,
    }));

    const total = await prisma.contestant.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);
    return {
      contestantes: Contestantes,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getContestantDetailWithGroups(
    contestantId: number,
    contestSlug: string,
    matchId: number
  ): Promise<any> {
    return prisma.contestant.findFirst({
      where: {
        id: contestantId,
        contest: {
          slug: contestSlug
        }
      },
      select: {
        id: true,
        roundId: true,
        studentId: true,
        status: true,
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        round: { select: { name: true } },
        contest: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          select: {
            group: {
              select: {
                id: true,
                name: true
              }
            }
          },
          where: {
            matchId: matchId
          }
        },
      },
    });
  }

  // Lấy danh sách thí sinh trong trận đấu theo slug cuộc thi và id trận đấu
  static async getContestantsInMatch(
    slug: string,
    matchId: number,
    query: {
      page: number;
      limit: number;
      search?: string;
      groupId?: number;
      schoolId?: number;
      classId?: number;
      roundId?: number;
      status?: string;
      schoolIds?: number[];
      classIds?: number[];
    }
  ): Promise<{
    contestants: Array<{
      id: number;
      fullName: string;
      studentCode: string | null;
      roundName: string;
      status: string;
      schoolId: number;
      schoolName: string;
      classId: number;
      className: string;
      groupId: number | null;
      groupName: string | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page,
      limit,
      search,
      groupId,
      schoolId,
      classId,
      roundId,
      status,
      schoolIds,
      classIds,
    } = query;
    const skip = (page - 1) * limit;

    // Tìm cuộc thi theo slug
    const contest = await prisma.contest.findFirst({
      where: { slug: slug }
    });

    if (!contest) {
      throw new Error("Không tìm thấy cuộc thi");
    }

    // Tìm trận đấu
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        contest: {
          slug: slug
        }
      }
    });

    if (!match) {
      throw new Error("Không tìm thấy trận đấu trong cuộc thi này");
    }

    // Build where clause giống getAll
    const whereClause: any = {
      contestId: contest.id,
      contestantMatches: {
        some: {
          matchId: matchId
        }
      }
    };

    // Filter by groupId
    if (groupId !== undefined) {
      if (groupId === -1) {
        // Chưa phân nhóm
        whereClause.contestantMatches = {
          none: { matchId: matchId }
        };
      } else if (groupId > 0) {
        whereClause.contestantMatches = {
          some: { matchId: matchId, groupId: groupId }
        };
      }
    }

    // // Filter by schoolId
    // if (schoolId !== undefined) {
    //   whereClause.student = {
    //     ...whereClause.student,
    //     class: {
    //       ...whereClause.student?.class,
    //       schoolId: schoolId
    //     }
    //   };
    // }

    // // Filter by classId
    // if (classId !== undefined) {
    //   whereClause.student = {
    //     ...whereClause.student,
    //     classId: classId
    //   };
    // }

    // Filter by roundId
    if (typeof roundId === "number" && !isNaN(roundId) && roundId > 0) {
      whereClause.roundId = roundId;
    }

    // Filter by status
    if (status !== undefined) {
      whereClause.status = status;
    }

    // // Filter by schoolIds/classIds (ưu tiên lọc đồng thời)
    // if (schoolIds && schoolIds.length > 0 && classIds && classIds.length > 0) {
    //   whereClause.student = {
    //     class: {
    //       schoolId: { in: schoolIds },
    //       id: { in: classIds }
    //     }
    //   };
    // } else if (schoolIds && schoolIds.length > 0) {
    //   whereClause.student = {
    //     class: {
    //       schoolId: { in: schoolIds }
    //     }
    //   };
    // } else if (classIds && classIds.length > 0) {
    //   whereClause.student = {
    //     class: {
    //       id: { in: classIds }
    //     }
    //   };
    // }
    const studentWhere: any = {};
    const classWhere: any = {};

    if (schoolId !== undefined) classWhere.schoolId = schoolId;
    if (classId !== undefined) classWhere.id = classId;
    if (schoolIds && schoolIds.length > 0) classWhere.schoolId = { in: schoolIds };
    if (classIds && classIds.length > 0) classWhere.id = { in: classIds };

    if (Object.keys(classWhere).length > 0) studentWhere.class = classWhere;
    if (Object.keys(studentWhere).length > 0) whereClause.student = studentWhere;

    // Filter by search
    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { student: { is: { fullName: { contains: keyword } } } },
        { student: { is: { studentCode: { contains: keyword } } } },
        { round: { is: { name: { contains: keyword } } } },
        { student: { is: { class: { is: { school: { is: { name: { contains: keyword } } } } } } } },
        { student: { is: { class: { is: { name: { contains: keyword } } } } } },
      ]);
    }

    // Đếm tổng số thí sinh
    const total = await prisma.contestant.count({
      where: whereClause
    });

    // Lấy danh sách thí sinh với thông tin nhóm trong trận đấu cụ thể
    const contestants = await prisma.contestant.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        student: {
          select: {
            fullName: true,
            studentCode: true,
            class: {
              select: {
                id: true,
                name: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        round: {
          select: {
            name: true,
          },
        },
        contestantMatches: {
          where: {
            matchId: matchId
          },
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { student: { fullName: 'asc' } }
      ]
    });

    // Transform dữ liệu để trả về đúng format
    const transformedContestants = contestants.map(contestant => {
      const group = contestant.contestantMatches?.[0]?.group || null;

      return {
        id: contestant.id,
        fullName: contestant.student.fullName,
        studentCode: contestant.student.studentCode,
        roundName: contestant.round.name,
        status: contestant.status,
        schoolId: contestant.student.class.school.id,
        schoolName: contestant.student.class.school.name,
        classId: contestant.student.class.id,
        className: contestant.student.class.name,
        groupId: group?.id || null,
        groupName: group?.name || null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      contestants: transformedContestants,
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

  // Lấy danh sách thí sinh bị loại để cứu trợ, sắp xếp theo số câu đúng và thứ tự bị loại
  static async getRescueCandidates(matchId: number) {
    // Lấy danh sách contestantMatch bị loại trong trận đấu này
    const eliminatedContestants = await prisma.contestantMatch.findMany({
      where: {
        matchId,
        status: 'eliminated',
      },
      select: {
        contestantId: true,
        eliminatedAtQuestionOrder: true,
        contestant: {
          select: {
            id: true,
            status: true,
            student: {
              select: {
                fullName: true,
                studentCode: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    school: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            round: { select: { name: true } },
          },
        },
      },
    });

    // Lấy số câu đúng của từng thí sinh trong trận đấu này
    const contestantIds = eliminatedContestants.map(e => e.contestantId);
    const results = await prisma.result.groupBy({
      by: ['contestantId'],
      where: {
        matchId,
        contestantId: { in: contestantIds },
        isCorrect: true,
      },
      _count: { id: true },
    });
    // Map contestantId -> correctAnswers
    const correctAnswersMap = new Map<number, number>();
    results.forEach(r => {
      correctAnswersMap.set(r.contestantId, r._count.id);
    });

    // Kết hợp dữ liệu và sắp xếp
    const data = eliminatedContestants.map(e => {
      const c = e.contestant;
      return {
        contestantId: e.contestantId,
        fullName: c.student.fullName,
        studentCode: c.student.studentCode,
        roundName: c.round.name,
        status: c.status,
        schoolId: c.student.class.school.id,
        schoolName: c.student.class.school.name,
        classId: c.student.class.id,
        className: c.student.class.name,
        correctAnswers: correctAnswersMap.get(e.contestantId) || 0,
        eliminatedAtQuestionOrder: e.eliminatedAtQuestionOrder,
      };
    });
    // Sắp xếp theo tiêu chí
    data.sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return (b.eliminatedAtQuestionOrder || 0) - (a.eliminatedAtQuestionOrder || 0);
    });
    return data;
  }
}
