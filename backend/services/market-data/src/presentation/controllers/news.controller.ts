import { Controller, Get, Post, Query } from '@nestjs/common';
import { NewsService } from '../../application/services/news.service';
import { NewsCategory } from '../../../generated/prisma';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async list(
    @Query('category') category: NewsCategory = 'CRYPTO',
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const result = await this.newsService.list(
      category,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return { success: true, data: result };
  }

  @Get('scrape-status')
  async scrapeStatus() {
    const status = await this.newsService.getScrapeStatus();
    return { success: true, data: status };
  }

  @Post('scrape')
  async triggerScrape(@Query('category') category: NewsCategory) {
    const count = await this.newsService.scrapeByCategory(category);
    return { success: true, data: { category, count } };
  }
}
