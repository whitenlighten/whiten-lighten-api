import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalNotesService } from './clinical-notes.service';

describe('ClinicalNotesService', () => {
  let service: ClinicalNotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClinicalNotesService],
    }).compile();

    service = module.get<ClinicalNotesService>(ClinicalNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
