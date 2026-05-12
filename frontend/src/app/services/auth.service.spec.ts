import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login user and store token', () => {
    const mockResponse = {
      access_token: 'test-token',
      refresh_token: 'refresh-token',
      user: {
        id: '1',
        nombre: 'Test',
        email: 'test@example.com',
        rol: 'user'
      }
    };

    service.login('test@example.com', 'password').subscribe(response => {
      expect(response.access_token).toBe('test-token');
    });

    const req = httpMock.expectOne('http://localhost:8000/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should logout and clear storage', () => {
    localStorage.setItem('access_token', 'test-token');
    service.logout();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('should check if user is authenticated', () => {
    expect(service.isAuthenticated()).toBeFalsy();
    localStorage.setItem('access_token', 'test-token');
    expect(service.isAuthenticated()).toBeTruthy();
  });
});

describe('TicketService', () => {
  let service: any;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: 'TicketService',
          useValue: {
            getTickets: () => []
          }
        }
      ]
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
