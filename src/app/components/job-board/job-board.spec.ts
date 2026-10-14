import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { JobBoard } from './job-board';
import { JobService } from '../../services/job.service';

describe('JobBoard', () => {
  let component: JobBoard;
  let fixture: ComponentFixture<JobBoard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobBoard, RouterTestingModule],
      providers: [
        {
          provide: JobService,
          useValue: {
            fetchPosts: () => of({}),
            annonces$: of([
              {
                id: 1,
                titre: 'Travaux de peinture',
                description: 'Besoin de peinture',
                imageUrl: 'https://example.com/image.jpg',
                userId: 1,
                fullName: 'Moi',
                date: 'Aujourd’hui',
                likes: 0,
                likedByMe: false,
                comments: []
              }
            ])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JobBoard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the post image when available', () => {
    const img = fixture.nativeElement.querySelector('img[alt="Illustration de l\'annonce"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/image.jpg');
  });
});
