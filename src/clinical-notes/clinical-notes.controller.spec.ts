import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalNotesController } from './clinical-notes.controller';

describe('ClinicalNotesController', () => {
  let controller: ClinicalNotesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClinicalNotesController],
    }).compile();

    controller = module.get<ClinicalNotesController>(ClinicalNotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
