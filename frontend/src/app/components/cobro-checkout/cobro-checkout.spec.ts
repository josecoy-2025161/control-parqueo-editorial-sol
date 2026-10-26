import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CobroCheckout } from './cobro-checkout';

describe('CobroCheckout', () => {
  let component: CobroCheckout;
  let fixture: ComponentFixture<CobroCheckout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CobroCheckout],
    }).compileComponents();

    fixture = TestBed.createComponent(CobroCheckout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
