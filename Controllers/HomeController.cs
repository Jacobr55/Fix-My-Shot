using FixMyShot.Data;
using FixMyShot.Helpers;
using FixMyShot.Models;
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

        public IActionResult Index()
        {
            return View();
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

        [HttpPost]
        public async Task<IActionResult> SaveAnalysis([FromBody] ShotAnalysisRequest request)
        {
            if (request == null || request.Frames == null || request.Frames.Count == 0)
                return BadRequest("No frame data received.");

            var avgElbow = request.Frames.Average(f => f.ElbowAngle);
            var avgFeet = request.Frames.Average(f => f.FeetDistance);
            var tips = AnalysisHelper.TipGeneration(avgElbow, avgFeet);

            var analysis = new ShotAnalysis
            {
                UserName = request.UserName,
                AverageElbowAngle = avgElbow,
                AverageFeetDistance = avgFeet,
                Tips = string.Join("\n", tips)
            };

            _context.ShotAnalyses.Add(analysis);
            await _context.SaveChangesAsync();

            return Json(new
            {
                averageElbowAngle = avgElbow,
                averageFeetDistance = avgFeet,
                tips
            });
        }

        public class ShotAnalysisRequest
        {
            public string UserName { get; set; } = "";
            public List<FramePose> Frames { get; set; } = new();
        }










    }
}
