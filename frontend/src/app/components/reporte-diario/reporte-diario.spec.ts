import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReporteDiario } from './reporte-diario';

describe('ReporteDiario', () => {
  let component: ReporteDiario;
  let fixture: ComponentFixture<ReporteDiario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteDiario],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteDiario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
