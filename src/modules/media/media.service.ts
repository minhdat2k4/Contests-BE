import { prisma } from "@/config/database";
import { Media } from "@prisma/client";
import { CreateMediaInput, UpdateMediaInput } from "./media.schema";
export default class MediaService {
  static async getAll(contestId: number): Promise<Media[] | null> {
    return prisma.media.findMany({
      where: {
        contestId: contestId,
        type: "images",
      },
    });
  }

  static async getBy(data: any): Promise<Media | null> {
    return prisma.media.findFirst({
      where: {
        ...data,
      },
    });
  }

  static async create(data: CreateMediaInput): Promise<Media | null> {
    return prisma.media.create({
      data: {
        ...data,
      },
    });
  }

  static async update(
    id: number,
    data: UpdateMediaInput
  ): Promise<Media | null> {
    const updateData: any = {};

    if (data.url !== undefined) {
      updateData.url = data.url;
    }

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    return prisma.media.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }
  static async delete(id: number): Promise<Media> {
    return prisma.media.delete({
      where: {
        id: id,
      },
    });
  }
}
