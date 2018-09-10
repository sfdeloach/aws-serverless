import { Injectable } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

import { CompareData } from './compare-data.model';
import { AuthService } from '../user/auth.service';

@Injectable()
export class CompareService {
  dataEdited = new BehaviorSubject<boolean>(false);
  dataIsLoading = new BehaviorSubject<boolean>(false);
  dataLoaded = new Subject<CompareData[]>();
  dataLoadFailed = new Subject<boolean>();
  userData: CompareData;
  constructor(private http: Http, private authService: AuthService) {}

  onStoreData(data: CompareData) {
    this.dataLoadFailed.next(false);
    this.dataIsLoading.next(true);
    this.dataEdited.next(false);
    this.userData = data;
    this.authService.currentUser.getSession((err, session) => {
      this.http
        .post('https://ci18exx0c8.execute-api.us-east-1.amazonaws.com/dev/compare-yourself', data, {
          headers: new Headers({
            Authorization: session.getIdToken().getJwtToken()
          })
        })
        .subscribe(
          result => {
            this.dataLoadFailed.next(false);
            this.dataIsLoading.next(false);
            this.dataEdited.next(true);
          },
          error => {
            this.dataIsLoading.next(false);
            this.dataLoadFailed.next(true);
            this.dataEdited.next(false);
          }
        );
    });
  }

  onRetrieveData(all = true) {
    this.dataLoaded.next(null);
    this.dataLoadFailed.next(false);

    this.authService.currentUser.getSession((err, session) => {
      if (err) {
        console.error(err);
        return;
      }

      const queryParam = '?accessToken=' + session.getAccessToken().getJwtToken();
      let urlParam = 'all';
      if (!all) {
        urlParam = 'single';
      }

      this.http
        .get(
          'https://ci18exx0c8.execute-api.us-east-1.amazonaws.com/dev/compare-yourself/' +
            urlParam +
            queryParam,
          {
            headers: new Headers({
              Authorization: session.getIdToken().getJwtToken()
            })
          }
        )
        .pipe(
          map((response: Response) => {
            return response.json();
          })
        )
        .subscribe(
          data => {
            if (all) {
              this.dataLoaded.next(data);
            } else {
              if (!data) {
                this.dataLoadFailed.next(true);
                return;
              }
              this.userData = data[0];
              this.dataEdited.next(true);
            }
          },
          error => {
            console.error(error);
            this.dataLoadFailed.next(true);
            this.dataLoaded.next(null);
          }
        );
    });
  }

  onDeleteData() {
    this.dataLoadFailed.next(false);
    this.authService.currentUser.getSession((sessionErr, session) => {
      if (sessionErr) {
        console.error(sessionErr);
        return;
      }

      this.http
        .delete('https://ci18exx0c8.execute-api.us-east-1.amazonaws.com/dev/compare-yourself', {
          headers: new Headers({
            Authorization: session.getIdToken().getJwtToken()
          })
        })
        .subscribe(
          data => {
            console.log(data);
          },
          error => this.dataLoadFailed.next(true)
        );
    });
  }
}
