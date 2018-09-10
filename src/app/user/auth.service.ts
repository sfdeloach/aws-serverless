import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Observable, BehaviorSubject } from 'rxjs';

import {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession
} from 'amazon-cognito-identity-js';

const POOL_DATA = {
  UserPoolId: 'us-east-1_STbx5mG9a',
  ClientId: '11gi4srhb3jrj3ekugphn10luj'
};

const userPool = new CognitoUserPool(POOL_DATA);

@Injectable()
export class AuthService {
  authIsLoading = new BehaviorSubject<boolean>(false);
  authDidFail = new BehaviorSubject<boolean>(false);
  authStatusChanged = new Subject<boolean>();
  authErrorMessage = new Subject<string>();
  currentUser: CognitoUser;

  constructor(private router: Router) {}

  signUp(username: string, email: string, password: string): void {
    this.authIsLoading.next(true);
    this.authDidFail.next(false);

    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({
        Name: 'email',
        Value: email
      })
    ];

    userPool.signUp(username, password, attributeList, null, (err, result) => {
      this.authIsLoading.next(false);
      if (err) {
        this.authErrorMessage.next(err.message || JSON.stringify(err));
        this.authDidFail.next(true);
      } else {
        this.authDidFail.next(false);
        this.currentUser = result.user;
        console.log(result);
      }
    });
  }

  confirmUser(username: string, code: string) {
    this.authIsLoading.next(true);

    if (!this.currentUser) {
      this.currentUser = new CognitoUser({ Username: username, Pool: userPool });
    }

    this.currentUser.confirmRegistration(code, true, (err, result) => {
      this.authIsLoading.next(false);
      if (err) {
        this.authErrorMessage.next(err.message || JSON.stringify(err));
        this.authDidFail.next(true);
      } else {
        this.authDidFail.next(false);
        console.log(result);
        this.router.navigate(['/']);
      }
    });
  }

  signIn(username: string, password: string): void {
    this.authIsLoading.next(true);
    const authData = {
      Username: username,
      Password: password
    };

    const authDetails = new AuthenticationDetails(authData);

    if (!this.currentUser) {
      this.currentUser = new CognitoUser({ Username: username, Pool: userPool });
    }

    this.currentUser.authenticateUser(authDetails, {
      onSuccess: (result: CognitoUserSession) => {
        this.authIsLoading.next(false);
        this.authDidFail.next(false);
        this.authStatusChanged.next(true);
        console.log('sign in successful');
        console.log(result);
      },
      onFailure: err => {
        this.authIsLoading.next(false);
        this.authDidFail.next(true);
        console.log('sign in failed');
        console.error(err);
      }
    });
  }

  logout() {
    if (this.currentUser) {
      this.currentUser.signOut();
    }
    this.authStatusChanged.next(false);
  }

  isAuthenticated(): Observable<boolean> {
    return Observable.create(observer => {
      this.currentUser = userPool.getCurrentUser();
      if (!this.currentUser) {
        observer.next(false);
      } else {
        // At this point, we have a local user but it has not been checked by cognito
        // getSession() will confirm if the currentUser has an authenticated session
        this.currentUser.getSession((err, session) => {
          if (err) {
            observer.next(false);
          } else {
            if (session.isValid()) {
              observer.next(true);
            } else {
              observer.next(false);
            }
          }
        });
      }
      observer.complete();
    });
  }

  initAuth() {
    this.isAuthenticated().subscribe(auth => this.authStatusChanged.next(auth));
  }
}
