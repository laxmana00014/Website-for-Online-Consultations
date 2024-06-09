import { Component, OnInit ,ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpClientModule, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../authentication.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { ServicesComponent } from '../Services/Services.component';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { last } from 'rxjs';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [HttpClientModule, CommonModule, RouterModule, ServicesComponent, FormsModule,ButtonModule,ToastModule],
  providers: [MessageService]

})
export class DashboardComponent implements OnInit {
  categories: any[] = [];
  enrolledServices: any[] = [];
  Services: any[] = [];
  ServicesContent: any[] = [];
  selectedServices: any;
  progressData: any[] = [];
  isSidebarVisible: boolean = false;
  showServicesOverviewSection: boolean = false; // New property to control visibility
  username: string | null = null;
  modalServices: any;
  allenrollServices:boolean = false;
  showAchievementsSection: boolean = false;
  constructor(
    private http: HttpClient,
    private router: Router,
    public authService: AuthenticationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.fetchEnrolledServices();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    } else {
      this.username = this.authService.getUsername();
            // console.log("name",this.username);
    }
  }
  fetchEnrolledServices(): void {
    const token = this.authService.getToken();
    if (!token) {
        // console.error('No token available for enrolled Services');
        return;
    }
  
    const apiUrl = 'http://localhost:8080/api/get-enrolled-Services';
    const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`
    });
  
    this.http.get<any[]>(apiUrl, { headers }).subscribe(
        (Services) => {
            if (Services.length === 0) {
                this.allenrollServices = true;
                console.log("No Services enrolled");
            } else {
                this.enrolledServices = Services;
                Services.forEach(Services => {
                    this.fetchProgress(Services.enrollmentId);
                    console.log("enrolled Services",this.enrolledServices);
                });
            }
        },
        (error) => {
            console.error('Error fetching enrolled Services:', error);
        }
    );
  }

  fetchProgress(enrollmentId: number): void {
    const token = this.authService.getToken();
    if (!token) {
      return;
    }
  
    const apiUrl = `http://localhost:8080/trackprogress/${enrollmentId}`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  
    this.http.get<any>(apiUrl, { headers }).subscribe(
      (progress) => {
        const Services = this.enrolledServices.find(Services => Services.enrollmentId === enrollmentId);
        if (Services && progress) {
          Services.progressPercentage = progress.progressPercentage;
          Services.lastAccessedDate = progress.lastAccessedDate; // Store last accessed date
          this.progressData = [];
          this.selectedServices = Services;
          this.progressData.push(progress);
          this.calculateContentStatus();
        }
      },
      (error) => {
        console.error('Error fetching progress for enrollmentId:', error);
      }
    );
  }
  
  calculateTotalProgress(): number {
    if (!this.selectedServices.ServicesContent || this.selectedServices.ServicesContent.length === 0) {
      return 0;
    }
    const totalItems = this.selectedServices.ServicesContent.length;
    let readItems = 0;
    for (const content of this.selectedServices.ServicesContent) {
      if (content.status === 'READ') {
        readItems++;
      }
    }
    return (readItems / totalItems) * 100;
  }
  toggleServicesContent(ServicesId: number): void {
    if (this.showServicesOverviewSection && this.selectedServices && this.selectedServices.Services.ServicesId === ServicesId) {
      this.resetServicesOverview();
    } else {
      this.fetchServicesContent(ServicesId);
      const Services = this.enrolledServices.find(Services => Services.Services.ServicesId === ServicesId);
      if (Services) {
        this.selectedServices = Services;
        this.showServicesOverviewSection = true;
        this.progressData = [];
        this.fetchProgress(Services.enrollmentId);
      }
    }
  }
  viewServicesDetails(Services: any): void {
    this.selectedServices = Services;

    // Check if the progress entry already exists for this Services
    const progress = this.progressData.find(progress => progress.enrollmentId === Services.enrollmentId);
    if (!progress) {
      this.createProgressEntry(Services.enrollmentId);
    } else {
      this.toggleServicesContent(Services.Services.ServicesId);
    }
  }


 
  
  

  
  createProgressEntry(enrollmentId: number): void {
    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for creating progress entry');
      return;
    }
  
    // Check if a progress entry already exists for this enrollmentId
    const existingProgress = this.progressData.find(progress => progress.enrollmentId === enrollmentId);
    if (existingProgress) {
      console.log('Progress entry already exists for enrollmentId:', enrollmentId);
      return; // Exit the method if a progress entry already exists
    }
  
    const lastAccessed = new Date().toISOString().split('T')[0];
  
    const apiUrl = 'http://localhost:8080/trackprogress/create';
    const requestBody = {
      enrollmentId: enrollmentId,
      progressPercentage: 0,
      lastAccessedDate: lastAccessed
    };
    console.log("createenry is ", requestBody);
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  
    this.http.post<any>(apiUrl, requestBody, { headers }).subscribe(
      (response) => {
        this.messageService.add({key:'toast1',severity:'success', summary:'Hurray', detail:'Started Learning the Services'});
        console.log('Progress entry created successfully:', response);
      },
      (error) => {
        console.error('Error creating progress entry:', error);
      }
    );
  }
  
  

  
  
  
  calculateContentStatus(): void {
    if (!this.selectedServices || !this.selectedServices.ServicesContent) {
      return;
    }
  
    const totalModules = this.selectedServices.ServicesContent.length;
    const completedModules = Math.round((this.selectedServices.progressPercentage / 100) * totalModules);
  
    for (let i = 0; i < totalModules; i++) {
      this.selectedServices.ServicesContent[i].status = i < completedModules ? 'READ' : 'UNREAD';
    }
  }
  
    

  fetchServicesContent(ServicesId: number): void {
    this.http.get<any[]>(`http://localhost:8080/auth/Services-content/${ServicesId}`).subscribe(
      (response: any[]) => {
        console.log(response);
        const Services= this.enrolledServices.find(Services  => Services .Services .ServicesId === ServicesId);
        if (Services) {
          Services.ServicesContent = response;
        }
      },
      (error) => {
        console.error('Error fetching Services content:', error);
      }
    );
  }
  goBackToServices (): void {
    this.resetServices Overview();
  }

  resetServices Overview(): void {
    this.selectedServices  = null;
    this.showServices OverviewSection = false; // Hide Services  overview section
  }
  showServices Overview(Services : any): void {
    this.selectedServices  = Services ;
  }



  toggleContentStatus(content: any, index: number): void {
    if (content.status === 'READ') {
      // Check if any subsequent modules are marked as 'READ' before marking this one as 'UNREAD'
      for (let i = index + 1; i < this.selectedServices .Services Content.length; i++) {
        if (this.selectedServices .Services Content[i].status === 'READ') {
          this.messageService.add({ key: 'toast1', severity: 'warn', summary: 'Warning', detail: 'You need to mark the subsequent modules as unread first.' });
          return;
        }
      }
      // Mark as unread
      content.status = 'UNREAD';
    } else {
      // Check if the previous module is marked as 'READ' before marking this one as 'READ'
      if (index > 0 && this.selectedServices .Services Content[index - 1].status !== 'READ') {
        this.messageService.add({ key: 'toast1', severity: 'warn', summary: 'Warning', detail: 'You need to complete the previous module first.' });
        return;
      }
      // Mark as read
      content.status = 'READ';
    }
  
    this.updateProgressPercentage(this.selectedServices .enrollmentId);
  }
  
  
  
  

  updateProgressPercentage(enrollmentId: number): void {
    const updatedPercentage = this.calculateTotalProgress();
  
    const lastAccessed = new Date().toISOString().split('T')[0];
    const apiUrl = `http://localhost:8080/trackprogress/updatePercentage`;
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    const body = {
      enrollmentId: enrollmentId,
      progressPercentage: updatedPercentage,
      lastAccessedDate: lastAccessed
    };
  
    this.http.put<any>(apiUrl, body, { headers }).subscribe(
      (response) => {
        console.log('Progress updated successfully');
        this.fetchProgress(enrollmentId);
      },
      (error) => {
        console.error('Error updating progress:', error);
      }
    );
  }
  
  
  getAchievedServices(): any[] {
    return this.enrolledServices .filter(Services  => Services .progressPercentage === 100);
  }
  showAchievements(event: Event): void {
    event.preventDefault(); // Prevent default anchor behavior
    this.showOverviewSection = False;
    this.showAchievementsSection = True;
  }
  


  
  checkUnenrollProgress(enrolledServices: any): void {
    if (enrolledServices .progressPercentage > 25) {
      console.log('Unenroll is not possible above 25% progress.');
    } else {
      this.unenrollServices(enrolledServices);
    }
  }
unenrollServices(enrolledServices: any): void {
  this.modalServices = enrolledServices;
}
unenrollServicesConfirm(ServicesId: number): void {
  const token = this.authService.getToken();
  if (!token) {
      console.error('No token available');
      return;
  }
  const apiUrl = `http://localhost:8080/api/unsubscribeServices`;
  const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
  });
  const body = {
    ServicesId: ServicesId
  };
  this.http.put<any>(apiUrl, body, { headers }).subscribe(
      () => {
          console.log('Unenrolled successfully');
          this.resetProgressPercentage(this.modalServices.enrollmentId);
          this.messageService.add({key:'toast1',severity:'warn', summary:'Unenrolled', detail:'Unenrolled successfully!'});
          // Remove the unenrolled Services from the enrolledServices array
          this.enrolledServices = this.enrolledServices.filter(Services => Services.Services.ServicesId !== ServicesId);
          // Check if there are no enrolled Services left
          if (this.enrolledServices.length === 0) {
              this.allenrollServices= true;
          }
          // Update the view
          setTimeout(() => {
              this.fetchEnrolledServices();
          },2000);
      },
      (error) => {
          console.error('Error unenrolling from Services:', error);
          this.messageService.add({key:'toast1',severity:'error', summary:'Server Error', detail:'Error unenrolling from Services!'});
      }
  );
}

resetProgressPercentage(enrollmentId: number): void {
  const updatedPercentage = 0;
  const lastAccessed = null;
  const apiUrl = `http://localhost:8080/trackprogress/updatePercentage`;
  const token = this.authService.getToken();
  const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
  });
  const body = {
      enrollmentId: enrollmentId,
      progressPercentage: updatedPercentage,
      lastAccessedDate: lastAccessed
  };

  console.log("reset", body);

  this.http.put<any>(apiUrl, body, { headers }).subscribe(
      () => {
          console.log('Reset Services progress successfully');
          
          // this.fetchEnrolledServices();  
      },
      (error) => {
          console.error('Error resetting progress:', error);
      }
  );
}

}