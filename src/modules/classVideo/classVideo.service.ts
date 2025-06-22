import { prisma } from "@/config/database";
import { ClassVideo } from "@prisma/client";
import {
  CreateClassVideoInput,
  UpdateClassVideoInput,
} from "./classVideo.schema";
export default class ClassVideoService {
  static async getAll(contestId: number): Promise<ClassVideo[] | null> {
    return prisma.classVideo.findMany({
      where: {
        contestId: contestId,
      },
    });
  }

  static async getBy(data: any): Promise<ClassVideo | null> {
    return prisma.classVideo.findFirst({
      where: {
        ...data,
      },
    });
  }

  static async create(data: CreateClassVideoInput): Promise<ClassVideo | null> {
    return prisma.classVideo.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateClassVideoInput
  ): Promise<ClassVideo | null> {
    const updateData: any = {};

    if (data.videos !== undefined) {
      updateData.videos = data.videos;
    }

    if (data.classId !== undefined) {
      updateData.classId = data.classId;
    }

    if (data.slogan !== undefined) {
      updateData.slogan = data.slogan;
    }

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    return prisma.classVideo.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async delete(id: number): Promise<ClassVideo> {
    return prisma.classVideo.delete({
      where: {
        id: id,
      },
    });
  }
}
