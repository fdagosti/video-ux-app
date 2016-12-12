import "rxjs/Rx";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs/Rx";
import {Http, Response, Headers, RequestOptions, URLSearchParams} from "@angular/http";

export class Category{
  constructor(public id:string="",public name="",public _links=""){

  }

}

@Injectable()
export class IVPService {

  private proxy = "https://cisco-itk-proxy.herokuapp.com/";
  private ctapUrl = this.proxy+"https://apx.cisco.com/spvss/infinitehome/infinitetoolkit/v_sandbox_2/";
  private LOCAL_STORAGE:string = "InfiniteUX-proto-token-v1";

  constructor(private http: Http) { }

  getCategories(categoryId =""): Observable<any[]>{
    return this.getHttpCall(null, "categories/"+categoryId)
      .map(cats => {
        cats.categories.length = Math.min(cats.categories.length, 7);
        return cats;
      })

  }

  getContentFromSearchedTerm(term, offset?, limit="6", delay=0){
    let params = new URLSearchParams();
    params.set('q', term); // the user's search value
    params.set('limit', limit); // the user's search value
    if (offset) params.set('offset', offset); // the user's search value

    return this.getHttpCall(params, "agg/content/",delay);
  }

  getContent(categoryId, offset?, limit="6",delay=0){
    let params = new URLSearchParams();
    params.set('categoryId', categoryId); // the user's search value
    params.set('limit', limit); // the user's search value
    if (offset) params.set('offset', offset); // the user's search value

    return this.getHttpCall(params, "agg/content/",delay)
  }

  getSuggestions(keyword){
    if (keyword == ""){
      return Observable.of([]);
    }

    let params = new URLSearchParams();
    params.set('q', keyword); // the user's search value
    params.set('limit', "10"); // the user's search value

    return this.getHttpCall(params, "keywords/suggest/")
      .map(json => json.suggestions);
  }

  getPlaySession(instanceId){

    let params = new URLSearchParams();
    params.set("instanceId", instanceId);

    return this.getHeadersWithAuth()
      .map((headers) => new RequestOptions({
        headers: headers,
        search: params
      }))
      .switchMap((options) => this.http.post(this.ctapUrl+"devices/me/playsessions", null,options))
      .map((res:Response) => res.json())
      .catch(this.handleError);
  }

  getSettings(){
    return this.getHttpCall(undefined, "userProfiles/me/settings");
  }

  private getHttpCall(params, urls, delay=0){
    return this.getHeadersWithAuth()
      .map((headers) => new RequestOptions({
        headers: headers,
        search: params
      }))
      .delay(delay)
      .switchMap((options) => this.http.get(this.ctapUrl+urls, options))
      .map((res:Response) => res.json())
      .catch(this.handleError);
  }

  private getHeadersWithAuth(){
    return this.getAccessToken()
      .map((token) => new Headers({"Authorization": "Bearer "+token}))

  }

  private login(){
    return this.http.post("/api/login_ivp", null)
      .map(res => this.saveToken(res.json()).access_token)
      .catch(this.handleError);
  }

  private _isLoggedIn = function(){
    var token = this.getToken();
    if (token) {
      return token.exp > Date.now() / 1000;
    } else {
      return false;
    }
  }

  private getAccessToken = function(){
    if (!this._isLoggedIn()){
      return this.login();
    }else{
      return Observable.of(this.getToken().access_token);
    }
  }

  private getToken(){
    let t = window.localStorage[this.LOCAL_STORAGE];
    if(t){
      return JSON.parse(t);
    }
  }

  private saveToken(token){
    token.exp = Date.now()/1000 + token.expires_in;
    window.localStorage[this.LOCAL_STORAGE] = JSON.stringify(token);
    return token || { };
  }

  private handleError (error: Response | any) {
    console.log("ERROR ",error);
    // In a real world app, we might use a remote logging infrastructure
    let errMsg: string;
    if (error instanceof Response) {
      const body = error.json() || '';
      const err = body.error || JSON.stringify(body);
      errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    console.error(errMsg);
    return Observable.throw(errMsg);
  }


}