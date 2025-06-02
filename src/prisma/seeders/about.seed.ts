import { SeedParams } from "@/types/seed";

export default async function seedAbout({ prisma, logger }: SeedParams) {
    try {
        await prisma.about.deleteMany();
        
        const aboutData = {
            schoolName: "Đài Truyền hình Việt Nam",
            website: "https://vtv.vn",
            departmentName: "Ban Sản xuất các chương trình Giáo dục",
            email: "olympia@vtv.vn",
            fanpage: "https://facebook.com/OlympiaOfficial",
            mapEmbedCode: `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.096750570489!2d105.8342404147706!3d21.02827408599568!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab9bd9861ca1%3A0xe7887f7b72ca17a9!2zVFRYVk4gLSBUcnVuZyB0w6JtIFRydeG7gWkgaGnhu4duaCB2w6AgVGjDtG5nIHRpbiBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1625097600000!5m2!1svi!2s" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`
        };

        const createdAbout = await prisma.about.create({ data: aboutData });

        logger.info(`Tạo thành công thông tin về chương trình`);
        return createdAbout;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu About:", error);
        throw error;
    }
}