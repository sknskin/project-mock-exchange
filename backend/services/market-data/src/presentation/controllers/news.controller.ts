/**
 * @file 뉴스 컨트롤러
 * @description 카테고리별 뉴스 조회, 스크래핑 상태 확인, 수동 스크래핑 트리거 API
 *
 * @file News Controller
 * @description API for category-based news listing, scrape status, and manual scrape trigger
 */
import { Controller, Get, Post, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { NewsService } from '../../application/services/news.service';
import { NewsCategory } from '../../../generated/prisma';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';

@UseGuards(InternalAuthGuard)
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async list(
    @Query('category') category: NewsCategory = 'CRYPTO',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const result = await this.newsService.list(category, safePage, safeLimit);
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
