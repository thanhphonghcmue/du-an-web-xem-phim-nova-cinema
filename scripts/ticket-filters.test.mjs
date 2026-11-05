import test from "node:test";
import assert from "node:assert/strict";
import { indexTickets, filterTickets } from "../frontend/src/ticketFilters.js";
const rows = indexTickets([
  {id:"one",ticketCode:"ABCD2345",movie:"Đường về",cinema:"NOVA Sala",bookedAt:"2026-11-01T08:00:00Z",startTime:"2026-11-09T11:00:00Z",endTime:"2026-11-09T13:00:00Z",isCheckedIn:false},
  {id:"two",ticketCode:"EFGH6789",movie:"Dune",cinema:"NOVA Riverside",bookedAt:"2026-11-02T08:00:00Z",startTime:"2026-11-08T18:30:00Z",endTime:"2026-11-08T20:30:00Z",isCheckedIn:true},
]);
test("wallet search handles short codes, unaccented titles and actual cinema names",()=>{
  for(const keyword of ["abcd2345","duong ve","nova sala"]) assert.deepEqual(filterTickets(rows,{keyword}).map(t=>t.id),["one"]);
  assert.equal(filterTickets(rows,{keyword:"not-there"}).length,0);
});
test("date picker uses Vietnam viewing dates independently of booking dates",()=>{
  assert.equal(rows[1].viewingDay,"2026-11-09");
  assert.equal(filterTickets(rows,{from:"2026-11-09",to:"2026-11-09"}).length,2);
  assert.deepEqual(filterTickets(rows,{dateBasis:"booked",from:"2026-11-01",to:"2026-11-01"}).map(t=>t.id),["one"]);
});
test("wallet status separates admission and past screenings; range and sort remain stable",()=>{
  assert.deepEqual(filterTickets(rows,{status:"used"}).map(t=>t.id),["two"]);
  assert.equal(filterTickets(rows,{status:"unused",now:Date.parse("2026-11-10")}).length,0);
  assert.equal(filterTickets(rows,{status:"past",now:Date.parse("2026-11-10")}).length,2);
  assert.equal(filterTickets(rows,{from:"2026-11-10",to:"2026-11-01"}).length,0);
  assert.deepEqual(filterTickets(rows,{sort:"showtime"}).map(t=>t.id),["two","one"]);
});
