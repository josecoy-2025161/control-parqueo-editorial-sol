import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecepcionCheckin } from './recepcion-checkin';

describe('RecepcionCheckin', () => {
  let component: RecepcionCheckin;
  let fixture: ComponentFixture<RecepcionCheckin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecepcionCheckin],
    }).compileComponents();

    fixture = TestBed.createComponent(RecepcionCheckin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
