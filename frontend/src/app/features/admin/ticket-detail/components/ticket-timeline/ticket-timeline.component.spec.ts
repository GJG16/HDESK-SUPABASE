import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketTimelineComponent } from './ticket-timeline.component';

describe('TicketTimelineComponent', () => {
  let component: TicketTimelineComponent;
  let fixture: ComponentFixture<TicketTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketTimelineComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TicketTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
