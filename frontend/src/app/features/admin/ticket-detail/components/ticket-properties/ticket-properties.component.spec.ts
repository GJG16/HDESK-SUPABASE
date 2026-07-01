import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketPropertiesComponent } from './ticket-properties.component';

describe('TicketPropertiesComponent', () => {
  let component: TicketPropertiesComponent;
  let fixture: ComponentFixture<TicketPropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketPropertiesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TicketPropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
