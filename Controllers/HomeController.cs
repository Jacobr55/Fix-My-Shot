using FixMyShot.Data;
using FixMyShot.Helpers;
using FixMyShot.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace FixMyShot.Controllers
{
    public class HomeController : Controller
    {

        private readonly ApplicationDbContext _context;

        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger, ApplicationDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public IActionResult HomePage()
        {
            return View();
        }

        public IActionResult Index()
        {
            return View();
           
        }
        [Authorize] // Only logged-in users can view history
        public async Task<IActionResult> History()
        {
            var userName = User.Identity?.Name;
            var analyses = await _context.ShotAnalyses
                .Where(a => a.UserName == userName)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return View(analyses);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
        //auth for save now.
        [HttpPost] // Anyone can analyze, but only logged-in users save to DB
        public async Task<IActionResult> SaveAnalysis([FromBody] ShotAnalysisRequest request)
        {
            if (request == null || request.Frames == null || request.Frames.Count == 0)
                return BadRequest("No frame data received.");

            var avgElbow = request.Frames.Average(f => f.ElbowAngle);
            var avgFeet = request.Frames.Average(f => f.FeetDistance);
            var tips = AnalysisHelper.TipGeneration(avgElbow, avgFeet);

            bool isAuthenticated = User.Identity?.IsAuthenticated ?? false;
            bool savedToHistory = false;

            // Only save to database if user is logged in
            if (isAuthenticated)
            {
                var analysis = new ShotAnalysis
                {
                    UserName = User.Identity?.Name ?? "Anonymous",
                    AverageElbowAngle = avgElbow,
                    AverageFeetDistance = avgFeet,
                    Tips = string.Join("\n", tips)
                };

                _context.ShotAnalyses.Add(analysis);
                await _context.SaveChangesAsync();
                savedToHistory = true;
            }

            return Json(new
            {
                averageElbowAngle = avgElbow,
                averageFeetDistance = avgFeet,
                tips,
                savedToHistory = savedToHistory,
                userName = isAuthenticated ? User.Identity?.Name : "Guest"
            });
        }

        public class ShotAnalysisRequest
        {
            public string UserName { get; set; } = "";
            public List<FramePose> Frames { get; set; } = new();
        }










    }
}
