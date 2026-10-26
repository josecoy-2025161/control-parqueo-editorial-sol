import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalTicketPerdido } from './modal-ticket-perdido';

describe('ModalTicketPerdido', () => {
  let component: ModalTicketPerdido;
  let fixture: ComponentFixture<ModalTicketPerdido>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalTicketPerdido],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalTicketPerdido);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
