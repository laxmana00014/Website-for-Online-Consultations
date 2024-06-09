import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../authentication.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-Services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ToastModule,
    ButtonModule,
  ],
  templateUrl: './Services.component.html',
  styleUrls: ['./Services.component.css'],
  providers: [MessageService],
})
export class ServicesComponent implements OnInit {
  categories: any[] = [];
  Services: any[] = [];
  ServicesContent: any[] = [];
  filteredCategories: any[] = [];
  searchTerm: string = '';
  selectedServicesId: number = 0;
  showEnrollment: boolean = false;
  selectedcategory: any;
  Servicescatelog: boolean = false;

  constructor(
    private http: HttpClient,
    public authService: AuthenticationService,
    public router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.fetchCategories();
  }

  toggleEnrollment(): void {
    this.showEnrollment = !this.showEnrollment;
  }

  enrollServices(ServicesId: number): void {
    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for Services enrollment');
      return;
    }
    const enrollmentDate = new Date().toISOString().split('T')[0];
    const apiUrl = 'http://localhost:8080/api/enroll';
    const requestBody = {
      ServicesId: ServicesId.toString(),
      enrollmentDate: enrollmentDate,
    };

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http.post(apiUrl, requestBody, { headers, observe: 'response' }).subscribe(
      (response) => {
        console.log('Enrolled successfully:', response);
        const responseBody = response.body as { message: string };
        if (responseBody) {
          const successMessage =
            responseBody.message === 'Re-Enrolled Successfully'
              ? 'Services Re-Enrolled successfully'
              : 'Services Enrolled successfully';
          this.messageService.add({
            key: 'toast1',
            severity: 'success',
            summary: 'Enrolled',
            detail: successMessage,
          });
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        }
      },
      (error) => {
        console.error('Error enrolling Services:', error);
        const errorMessage =
          error.status === 400 && error.error.message === 'User is already enrolled'
            ? 'Services already enrolled'
            : 'Failed to enroll. Please try again!';
        this.messageService.add({
          key: 'toast1',
          severity: error.status === 400 ? 'warn' : 'error',
          summary: 'Failed',
          detail: errorMessage,
        });
        console.error('Error details:', error.error);
      }
    );
  }

  fetchCategories(): void {
    this.http.get<any[]>('http://localhost:8080/auth/categories').subscribe(
      (response: any[]) => {
        this.categories = response.map((categoryString) => categoryString.split(', '));
        this.filteredCategories = this.categories.slice();
      },
      (error) => {
        console.error('Error fetching categories:', error);
      }
    );
  }

  filterCategories(): void {
    this.filteredCategories = this.categories.filter((category) =>
      category[1].toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  toggleCategory(category: any): void {
    const categoryId = category[0];
    this.http.get<any[]>(`http://localhost:8080/auth/${categoryId}`).subscribe(
      (response: any[]) => {
        this.Services = response;
        this.showEnrollment = false;
        this.selectedcategory = category[1] + ' Services';
        this.Servicescatelog = true;
      },
      (error) => {
        console.error('Error fetching Services:', error);
      }
    );
  }

  fetchServicesContent(ServicesId: number): void {
    this.http.get<any[]>(`http://localhost:8080/auth/Services-content/${ServicesId}`).subscribe(
      (response: any[]) => {
        console.log(response);
        this.ServicesContent = response;
      },
      (error) => {
        console.error('Error fetching Services content:', error);
      }
    );
  }

  toggleServicesContent(ServicesId: number): void {
    this.Services.forEach((Services) => {
      Services.showContent = false;
    });

    const index = this.Services.findIndex((Services) => Services.ServicesId === ServicesId);
    if (index !== -1) {
      this.Services[index].showContent = !this.Services[index].showContent;
      if (this.Services[index].showContent) {
        this.fetchServicesContent(ServicesId);
        this.selectedServicesId = ServicesId;
        this.showEnrollment = true;
        window.scrollTo(0, 0);
      }
    }
  }
}
