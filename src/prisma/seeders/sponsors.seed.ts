import { SeedParams } from "@/types/seed";

export default async function seedSponsors({ prisma, logger }: SeedParams) {
    try {
        await prisma.sponsor.deleteMany();
        
        const sponsors = [
            {
                name: "Tập đoàn Vingroup",
                logo: "/images/sponsors/vingroup-logo.png",
                images: "/images/sponsors/vingroup-gallery.jpg",
                videos: "/videos/sponsors/vingroup-intro.mp4"
            },
            {
                name: "Ngân hàng Vietcombank",
                logo: "/images/sponsors/vietcombank-logo.png", 
                images: "/images/sponsors/vietcombank-gallery.jpg",
                videos: "/videos/sponsors/vietcombank-intro.mp4"
            },
            {
                name: "Tập đoàn FPT",
                logo: "/images/sponsors/fpt-logo.png",
                images: "/images/sponsors/fpt-gallery.jpg", 
                videos: "/videos/sponsors/fpt-intro.mp4"
            },
            {
                name: "Công ty Samsung Việt Nam",
                logo: "/images/sponsors/samsung-logo.png",
                images: "/images/sponsors/samsung-gallery.jpg",
                videos: "/videos/sponsors/samsung-intro.mp4"
            },
            {
                name: "Tập đoàn Masan",
                logo: "/images/sponsors/masan-logo.png",
                images: "/images/sponsors/masan-gallery.jpg",
                videos: "/videos/sponsors/masan-intro.mp4"
            },
            {
                name: "Công ty Grab Việt Nam",
                logo: "/images/sponsors/grab-logo.png",
                images: "/images/sponsors/grab-gallery.jpg",
                videos: "/videos/sponsors/grab-intro.mp4"
            }
        ];

        const createdSponsors = await Promise.all(
            sponsors.map(sponsor => prisma.sponsor.create({ data: sponsor }))
        );

        logger.info(`Tạo thành công ${createdSponsors.length} nhà tài trợ`);
        return createdSponsors;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu nhà tài trợ:", error);
        throw error;
    }
}
