var http =  require("http");

export interface IOptions{
    host:string;
    path:string;
    header:string;
}
export interface IGrabber{
    doGet(options:IOptions, cb): void;
    doPut(options:IOptions, cb): void;
}

export class Grabber implements IGrabber{
    constructor(public JmonitorOption:IOptions){};
    doGet = (options:IOptions, cb):void => {
        var programHandler = (res) => {
            var str = '';
            res.on('data', function (chunk) {
                str += chunk;
            });
            res.on("error", function (err) {
                console.error("http response unhandled error", err);
                cb(err)
            });
            res.on('end', function () {
                cb(null, str);
            });
        };

        let proxy = http.request(options, programHandler);

        proxy.on("error", function (err) {
            console.error("proxy unhandled error", err);
        });

        proxy.end();
    };
    doPut = (options, callback) => {
            var programHandler = (res) => {
                var str = '';
                res.on('data', function (chunk) {
                    str += chunk;
                });
                res.on("error", function (err) {
                    console.error("http response unhandled error", err);
                });
                res.on('end', function () {
                    callback(null, str);
                });
            };

            let proxy = http.request(options, programHandler);

            proxy.on("error", function (err) {
                console.error("proxy unhandled error", err);
            });

            proxy.end();
        };

}

export class Bookmaker{
    id: number;
    name: string;
    url: string;
    constructor(id: number, name: string){ 
        this.id = id;
        this.name = name;
    }
}

export class Sign {
    name: string;
    protected price: number;
    oldPrice: number;
    changed: boolean = false;

    constructor(name:string){ this.name = name;}
    
    setPrice =(x:number): boolean =>{
        if(this.oldPrice!=this.price) this.changed = true;
        else this.changed = false;
        this.oldPrice = this.price;
        this.price = x;
        return this.changed;
    }
    
    getPrice = ()=> this.price;
}

export class Market {
    signs: Sign[];
    constructor(public name:string){}
}

export class Market1X2 extends Market {
    constructor(){
        super('1X2');
        this.signs = [ new Sign("1"), new Sign("X"), new Sign("2")];
    }
    update = (signs: Sign[]): boolean => {
        let changed = false;
        for (var index in signs){
            if (this.signs[index].name == signs[index].name)
                changed = changed || this.signs[index].setPrice(signs[index].getPrice())
            else throw ("Position of signs in the input array must be in the following format [1,X,2] ");
        }
        return changed;
    }
}

export class Competitior {
    market1X2: Market1X2;
    constructor(public bookmakerId: number , public name: string){
        this.market1X2 = new Market1X2();
    }
}

export class Fixture {
    id: number;
    betradarId: number;
    name: string;
    date: Date;
    league: string;
    leagueId: number;
    country: string;
    contryCode: string; 
    competitiors: Competitior[] =[];

    constructor(book:Bookmaker, betradarId:number, name:string, bookmakers: Bookmaker[], date: Date, league?:string, leagueId?:number){
        if (typeof league !== "undefined") this.league = league;
         if (typeof leagueId !== "undefined") this.leagueId = leagueId;
         
        this.betradarId = betradarId;
        this.name = name;
        this.date = date;
        for (var b of bookmakers){
            this.competitiors.push (new Competitior(b.id, b.name));
        }
    }
    getCompetitor(book:Bookmaker):Competitior{
        var r:Competitior;
        for (let c of this.competitiors){
            if(c.bookmakerId == book.id){
                r = c;
                break;
            }
        }
        return r;
    }
}

export class Fixtures {
    private static instance: Fixtures;
    private map:{[id: number]: Fixture;} = {}; 
    private constructor() {
        this.map ={};
    }
    static getInstance() {
        if (!Fixtures.instance) {
            Fixtures.instance = new Fixtures();
        }
        return Fixtures.instance;
    }
    
    merge(fixture: Fixture, book: Bookmaker):number | Sign[] { 
        if(this.map[fixture.betradarId]){
            //get competitor of book;
            var input:Sign[] = fixture.getCompetitor(book).market1X2.signs
            //update the competitior
            if (this.map[fixture.betradarId].getCompetitor(book).market1X2.update(input)) return input
            else return Object.keys(this.map).length;
        }else{
            //insert new fixture
            this.map[fixture.betradarId] = fixture;
            return Object.keys(this.map).length;
        }
    }
}