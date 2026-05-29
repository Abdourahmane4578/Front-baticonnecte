import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevisRequest } from './devis-request';

describe('DevisRequest', () => {
  let component: DevisRequest;
  let fixture: ComponentFixture<DevisRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevisRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DevisRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
