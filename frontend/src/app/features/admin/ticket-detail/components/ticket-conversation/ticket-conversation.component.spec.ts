import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketConversationComponent } from './ticket-conversation.component';

describe('TicketConversationComponent', () => {
  let component: TicketConversationComponent;
  let fixture: ComponentFixture<TicketConversationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketConversationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TicketConversationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
